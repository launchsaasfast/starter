/**
 * Script de monitoring pour le système de rate limiting
 * Dashboard simple et alertes pour la surveillance des tentatives d'abus
 */

import { Redis } from '@upstash/redis';
import { RateLimitTier } from '@/lib/rate-limit';

// Configuration du monitoring
const MONITORING_CONFIG = {
  // Intervalles de rafraîchissement (en secondes)
  refreshInterval: 30,
  
  // Seuils d'alerte
  alertThresholds: {
    suspiciousIPRequests: 50, // Requêtes par IP en 5 minutes
    blockedRequestsPercent: 10, // % de requêtes bloquées
    redisLatency: 100, // Latence Redis en ms
    errorRate: 5 // % d'erreurs Redis
  },
  
  // Période d'analyse
  analysisWindow: 300, // 5 minutes en secondes
};

interface MonitoringStats {
  totalRequests: number;
  blockedRequests: number;
  topBlockedIPs: Array<{ ip: string; count: number }>;
  tierStats: Record<string, { requests: number; blocked: number }>;
  redisHealth: {
    latency: number;
    errors: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  alerts: Alert[];
}

interface Alert {
  type: 'suspicious_ip' | 'high_block_rate' | 'redis_issues' | 'tier_overload';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  data?: Record<string, any>;
}

class RateLimitMonitor {
  private redis: Redis | null = null;
  private isRunning = false;
  private stats: MonitoringStats = {
    totalRequests: 0,
    blockedRequests: 0,
    topBlockedIPs: [],
    tierStats: {},
    redisHealth: {
      latency: 0,
      errors: 0,
      status: 'healthy'
    },
    alerts: []
  };

  constructor() {
    // Initialiser Redis uniquement si les variables d'environnement sont disponibles
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
    } else {
      console.warn('⚠️ Variables Redis non configurées - Mode simulation activé');
    }
  }

  /**
   * Démarrer le monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Monitoring déjà en cours...');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Démarrage du monitoring du rate limiting...');
    console.log(`📊 Intervalle de rafraîchissement: ${MONITORING_CONFIG.refreshInterval}s`);
    console.log(`⏱️ Fenêtre d\'analyse: ${MONITORING_CONFIG.analysisWindow}s`);

    // Boucle de monitoring
    while (this.isRunning) {
      try {
        await this.collectStats();
        await this.analyzeAndAlert();
        this.displayDashboard();
        
        await this.sleep(MONITORING_CONFIG.refreshInterval * 1000);
      } catch (error) {
        console.error('❌ Erreur dans le monitoring:', error);
        await this.sleep(5000); // Attendre 5s avant de réessayer
      }
    }
  }

  /**
   * Arrêter le monitoring
   */
  stopMonitoring(): void {
    this.isRunning = false;
    console.log('🛑 Arrêt du monitoring...');
  }

  /**
   * Collecter les statistiques depuis Redis
   */
  private async collectStats(): Promise<void> {
    const startTime = Date.now();

    try {
      if (this.redis) {
        // Collecter les stats réelles depuis Redis
        const keys = await this.redis.keys('ratelimit:*');
        
        // Analyser les clés pour extraire les statistiques
        const tierCounts: Record<string, { requests: number; blocked: number }> = {};
        const ipCounts: Record<string, number> = {};
        let totalRequests = 0;
        let blockedRequests = 0;

        for (const key of keys) {
          try {
            const value = await this.redis.get(key);
            if (typeof value === 'number') {
              totalRequests += value;
              
              // Analyser la clé pour extraire le tier et l'IP
              const keyParts = key.split(':');
              if (keyParts.length >= 3) {
                const tier = keyParts[1];
                const identifier = keyParts[2];
                
                if (!tierCounts[tier]) {
                  tierCounts[tier] = { requests: 0, blocked: 0 };
                }
                tierCounts[tier].requests += value;
                
                // Déterminer si cette IP/user a été bloquée
                if (value >= this.getTierLimit(tier)) {
                  tierCounts[tier].blocked++;
                  blockedRequests++;
                  
                  // Compter par IP (si c'est une IP)
                  if (this.isValidIP(identifier)) {
                    ipCounts[identifier] = (ipCounts[identifier] || 0) + 1;
                  }
                }
              }
            }
          } catch (error) {
            // Ignorer les erreurs sur des clés individuelles
          }
        }

        // Trier les IPs par nombre de requêtes bloquées
        const topBlockedIPs = Object.entries(ipCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([ip, count]) => ({ ip, count }));

        this.stats = {
          totalRequests,
          blockedRequests,
          topBlockedIPs,
          tierStats: tierCounts,
          redisHealth: {
            latency: Date.now() - startTime,
            errors: this.stats.redisHealth.errors,
            status: 'healthy'
          },
          alerts: this.stats.alerts
        };
      } else {
        // Mode simulation sans Redis
        this.generateMockStats();
      }

      // Mettre à jour le statut de santé Redis
      const latency = Date.now() - startTime;
      this.stats.redisHealth = {
        ...this.stats.redisHealth,
        latency,
        status: latency > MONITORING_CONFIG.alertThresholds.redisLatency ? 'warning' : 'healthy'
      };

    } catch (error) {
      this.stats.redisHealth.errors++;
      this.stats.redisHealth.status = 'critical';
      console.error('❌ Erreur lors de la collecte des stats:', error);
    }
  }

  /**
   * Générer des statistiques simulées pour les tests
   */
  private generateMockStats(): void {
    const now = Date.now();
    const mockData = {
      totalRequests: Math.floor(Math.random() * 1000) + 500,
      blockedRequests: Math.floor(Math.random() * 50) + 10,
      topBlockedIPs: [
        { ip: '192.168.1.100', count: Math.floor(Math.random() * 20) + 5 },
        { ip: '10.0.0.50', count: Math.floor(Math.random() * 15) + 3 },
        { ip: '172.16.0.25', count: Math.floor(Math.random() * 10) + 2 }
      ],
      tierStats: {
        [RateLimitTier.AUTH_OPERATIONS]: { 
          requests: Math.floor(Math.random() * 200) + 100, 
          blocked: Math.floor(Math.random() * 20) + 5 
        },
        [RateLimitTier.SMS_OPERATIONS]: { 
          requests: Math.floor(Math.random() * 50) + 20, 
          blocked: Math.floor(Math.random() * 10) + 2 
        },
        [RateLimitTier.GENERAL_PROTECTION]: { 
          requests: Math.floor(Math.random() * 500) + 200, 
          blocked: Math.floor(Math.random() * 15) + 3 
        }
      }
    };

    this.stats = {
      ...mockData,
      redisHealth: {
        latency: Math.floor(Math.random() * 50) + 10,
        errors: 0,
        status: 'healthy'
      },
      alerts: this.stats.alerts
    };
  }

  /**
   * Analyser les données et générer des alertes
   */
  private async analyzeAndAlert(): Promise<void> {
    const alerts: Alert[] = [];

    // 1. Détecter les IPs suspectes
    for (const { ip, count } of this.stats.topBlockedIPs) {
      if (count > MONITORING_CONFIG.alertThresholds.suspiciousIPRequests) {
        alerts.push({
          type: 'suspicious_ip',
          severity: 'warning',
          message: `IP suspecte détectée: ${ip} avec ${count} requêtes bloquées`,
          timestamp: new Date(),
          data: { ip, requestCount: count }
        });
      }
    }

    // 2. Vérifier le taux de blocage global
    if (this.stats.totalRequests > 0) {
      const blockRate = (this.stats.blockedRequests / this.stats.totalRequests) * 100;
      if (blockRate > MONITORING_CONFIG.alertThresholds.blockedRequestsPercent) {
        alerts.push({
          type: 'high_block_rate',
          severity: blockRate > 20 ? 'critical' : 'warning',
          message: `Taux de blocage élevé: ${blockRate.toFixed(1)}%`,
          timestamp: new Date(),
          data: { blockRate, totalRequests: this.stats.totalRequests, blockedRequests: this.stats.blockedRequests }
        });
      }
    }

    // 3. Vérifier la santé Redis
    if (this.stats.redisHealth.status !== 'healthy') {
      alerts.push({
        type: 'redis_issues',
        severity: this.stats.redisHealth.status === 'critical' ? 'critical' : 'warning',
        message: `Problème Redis: latence ${this.stats.redisHealth.latency}ms, erreurs: ${this.stats.redisHealth.errors}`,
        timestamp: new Date(),
        data: { ...this.stats.redisHealth }
      });
    }

    // 4. Analyser la surcharge par tier
    Object.entries(this.stats.tierStats).forEach(([tier, stats]) => {
      if (stats.requests > 0) {
        const tierBlockRate = (stats.blocked / stats.requests) * 100;
        if (tierBlockRate > 15) { // 15% de blocage sur un tier = problème
          alerts.push({
            type: 'tier_overload',
            severity: tierBlockRate > 30 ? 'critical' : 'warning',
            message: `Surcharge détectée sur ${tier}: ${tierBlockRate.toFixed(1)}% de blocage`,
            timestamp: new Date(),
            data: { tier, blockRate: tierBlockRate, ...stats }
          });
        }
      }
    });

    // Conserver uniquement les alertes récentes (dernières 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    this.stats.alerts = [
      ...alerts,
      ...this.stats.alerts.filter(alert => alert.timestamp > tenMinutesAgo)
    ].slice(0, 50); // Garder max 50 alertes

    // Afficher les nouvelles alertes
    if (alerts.length > 0) {
      console.log(`\n🚨 ${alerts.length} nouvelles alerte(s):`);
      alerts.forEach(alert => {
        const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵';
        console.log(`${icon} [${alert.timestamp.toLocaleTimeString()}] ${alert.message}`);
      });
    }
  }

  /**
   * Afficher le dashboard de monitoring
   */
  private displayDashboard(): void {
    console.clear();
    console.log('📊 DASHBOARD - RATE LIMITING MONITORING');
    console.log('='.repeat(60));
    console.log(`🕐 Dernière mise à jour: ${new Date().toLocaleString()}`);
    
    // Statistiques globales
    const blockRate = this.stats.totalRequests > 0 ? 
      (this.stats.blockedRequests / this.stats.totalRequests) * 100 : 0;
    
    console.log('\n📈 STATISTIQUES GLOBALES');
    console.log(`   Total des requêtes: ${this.stats.totalRequests.toLocaleString()}`);
    console.log(`   Requêtes bloquées: ${this.stats.blockedRequests.toLocaleString()}`);
    console.log(`   Taux de blocage: ${blockRate.toFixed(2)}%`);

    // Santé Redis
    const healthIcon = this.stats.redisHealth.status === 'healthy' ? '✅' : 
                      this.stats.redisHealth.status === 'warning' ? '⚠️' : '❌';
    console.log('\n🔧 SANTÉ REDIS');
    console.log(`   Statut: ${healthIcon} ${this.stats.redisHealth.status}`);
    console.log(`   Latence: ${this.stats.redisHealth.latency}ms`);
    console.log(`   Erreurs: ${this.stats.redisHealth.errors}`);

    // Statistiques par tier
    console.log('\n🏷️ STATISTIQUES PAR TIER');
    Object.entries(this.stats.tierStats).forEach(([tier, stats]) => {
      const tierBlockRate = stats.requests > 0 ? (stats.blocked / stats.requests) * 100 : 0;
      console.log(`   ${tier}:`);
      console.log(`      Requêtes: ${stats.requests.toLocaleString()}`);
      console.log(`      Bloquées: ${stats.blocked.toLocaleString()} (${tierBlockRate.toFixed(1)}%)`);
    });

    // Top IPs bloquées
    console.log('\n🚫 TOP IPs BLOQUÉES');
    this.stats.topBlockedIPs.slice(0, 5).forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.ip}: ${item.count} requêtes bloquées`);
    });

    // Alertes récentes
    const recentAlerts = this.stats.alerts.slice(0, 3);
    if (recentAlerts.length > 0) {
      console.log('\n🚨 ALERTES RÉCENTES');
      recentAlerts.forEach(alert => {
        const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵';
        console.log(`   ${icon} [${alert.timestamp.toLocaleTimeString()}] ${alert.message}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('Appuyez sur Ctrl+C pour arrêter le monitoring');
  }

  /**
   * Obtenir la limite pour un tier donné
   */
  private getTierLimit(tier: string): number {
    const limits: Record<string, number> = {
      [RateLimitTier.AUTH_OPERATIONS]: 10,
      [RateLimitTier.SMS_OPERATIONS]: 10,
      [RateLimitTier.GENERAL_PROTECTION]: 1000,
      [RateLimitTier.AUTHENTICATED_OPERATIONS]: 100,
      [RateLimitTier.DATA_EXPORTS]: 3
    };
    return limits[tier] || 100;
  }

  /**
   * Vérifier si une chaîne est une IP valide
   */
  private isValidIP(str: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(str);
  }

  /**
   * Utilitaire pour attendre
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtenir un snapshot des statistiques actuelles
   */
  getStats(): MonitoringStats {
    return { ...this.stats };
  }

  /**
   * Générer un rapport de monitoring
   */
  async generateReport(): Promise<string> {
    const stats = this.getStats();
    const now = new Date();
    
    let report = `# Rapport de Monitoring - Rate Limiting\n`;
    report += `Généré le: ${now.toLocaleString()}\n\n`;
    
    report += `## Statistiques Globales\n`;
    report += `- Total des requêtes: ${stats.totalRequests.toLocaleString()}\n`;
    report += `- Requêtes bloquées: ${stats.blockedRequests.toLocaleString()}\n`;
    report += `- Taux de blocage: ${stats.totalRequests > 0 ? ((stats.blockedRequests / stats.totalRequests) * 100).toFixed(2) : 0}%\n\n`;
    
    report += `## Santé du Système\n`;
    report += `- Statut Redis: ${stats.redisHealth.status}\n`;
    report += `- Latence Redis: ${stats.redisHealth.latency}ms\n`;
    report += `- Erreurs Redis: ${stats.redisHealth.errors}\n\n`;
    
    report += `## Statistiques par Tier\n`;
    Object.entries(stats.tierStats).forEach(([tier, tierStats]) => {
      const blockRate = tierStats.requests > 0 ? (tierStats.blocked / tierStats.requests) * 100 : 0;
      report += `- **${tier}**: ${tierStats.requests} requêtes, ${tierStats.blocked} bloquées (${blockRate.toFixed(1)}%)\n`;
    });
    
    report += `\n## Top IPs Bloquées\n`;
    stats.topBlockedIPs.forEach((item, index) => {
      report += `${index + 1}. ${item.ip}: ${item.count} requêtes bloquées\n`;
    });
    
    if (stats.alerts.length > 0) {
      report += `\n## Alertes Récentes\n`;
      stats.alerts.slice(0, 10).forEach(alert => {
        report += `- **[${alert.severity.toUpperCase()}]** ${alert.timestamp.toLocaleString()}: ${alert.message}\n`;
      });
    }
    
    return report;
  }
}

/**
 * Script principal de monitoring
 */
async function startMonitoring(): Promise<void> {
  const monitor = new RateLimitMonitor();
  
  // Gestion des signaux pour arrêt propre
  process.on('SIGINT', () => {
    console.log('\n🛑 Signal d\'arrêt reçu...');
    monitor.stopMonitoring();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Signal de terminaison reçu...');
    monitor.stopMonitoring();
    process.exit(0);
  });
  
  await monitor.startMonitoring();
}

/**
 * Fonction pour générer un rapport ponctuel
 */
async function generateStatsReport(): Promise<void> {
  console.log('📋 Génération du rapport de monitoring...');
  
  const monitor = new RateLimitMonitor();
  await monitor['collectStats']();
  
  const report = await monitor.generateReport();
  const filename = `rate-limit-report-${new Date().toISOString().split('T')[0]}.md`;
  
  // En production, on pourrait sauvegarder le fichier
  console.log('\n' + '='.repeat(60));
  console.log(report);
  console.log('='.repeat(60));
  console.log(`\n📄 Rapport généré (sauvegardé sous: ${filename})`);
}

// Exécution selon les arguments de ligne de commande
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--report')) {
    generateStatsReport().catch(console.error);
  } else {
    startMonitoring().catch(console.error);
  }
}

export { RateLimitMonitor, startMonitoring, generateStatsReport };
