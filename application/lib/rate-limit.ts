/**
 * Service central de rate limiting pour l'application Mazeway
 * Implémente les tiers de limitation selon security-algorithms.md
 * Utilise Upstash Redis avec sliding window algorithm
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Types et interfaces
export interface RateLimitConfig {
  requests: number;
  window: string;
  windowMs: number; // Fenêtre en millisecondes pour Upstash
  identifier?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export enum RateLimitTier {
  AUTH_OPERATIONS = 'AUTH_OPERATIONS',
  SMS_OPERATIONS = 'SMS_OPERATIONS', 
  GENERAL_PROTECTION = 'GENERAL_PROTECTION',
  AUTHENTICATED_OPERATIONS = 'AUTHENTICATED_OPERATIONS',
  DATA_EXPORTS = 'DATA_EXPORTS'
}

// Configuration des tiers selon security-algorithms.md
export const RATE_LIMIT_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  [RateLimitTier.AUTH_OPERATIONS]: {
    requests: 10,
    window: '10s',
    windowMs: 10 * 1000 // 10 secondes
  },
  [RateLimitTier.SMS_OPERATIONS]: {
    requests: 5, // Sera ajusté selon IP vs user
    window: '1h',
    windowMs: 60 * 60 * 1000 // 1 heure
  },
  [RateLimitTier.GENERAL_PROTECTION]: {
    requests: 1000,
    window: '1m',
    windowMs: 60 * 1000 // 1 minute
  },
  [RateLimitTier.AUTHENTICATED_OPERATIONS]: {
    requests: 100,
    window: '1m',
    windowMs: 60 * 1000 // 1 minute
  },
  [RateLimitTier.DATA_EXPORTS]: {
    requests: 3,
    window: '1d',
    windowMs: 24 * 60 * 60 * 1000 // 1 jour
  }
};

// Configuration SMS spécifique (IP + user-based)
export const SMS_RATE_LIMITS = {
  PER_IP: { requests: 5, window: '1h', windowMs: 60 * 60 * 1000 },
  PER_USER: { requests: 3, window: '1h', windowMs: 60 * 60 * 1000 }
} as const;

/**
 * Service de rate limiting centralisé
 */
export class RateLimitService {
  private redis: Redis;
  private rateLimiters: Map<string, Ratelimit> = new Map();

  constructor() {
    // Initialisation du client Redis
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    // Pré-initialisation des rate limiters
    this.initializeRateLimiters();
  }

  /**
   * Initialise les rate limiters pour tous les tiers
   */
  private initializeRateLimiters(): void {
    Object.entries(RATE_LIMIT_CONFIGS).forEach(([tier, config]) => {
      const ratelimit = new Ratelimit({
        redis: this.redis,
        limiter: Ratelimit.slidingWindow(config.requests, `${config.windowMs}ms`),
        analytics: true,
      });
      
      this.rateLimiters.set(tier, ratelimit);
    });

    // Rate limiters spéciaux pour SMS
    this.rateLimiters.set('SMS_IP', new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(SMS_RATE_LIMITS.PER_IP.requests, `${SMS_RATE_LIMITS.PER_IP.windowMs}ms`),
      analytics: true,
    }));

    this.rateLimiters.set('SMS_USER', new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(SMS_RATE_LIMITS.PER_USER.requests, `${SMS_RATE_LIMITS.PER_USER.windowMs}ms`),
      analytics: true,
    }));
  }

  /**
   * Génère une clé unique pour le rate limiting
   */
  public generateKey(type: string, identifier: string): string {
    return `ratelimit:${type}:${identifier}`;
  }

  /**
   * Vérifie les limites de rate limiting
   */
  public async checkLimit(
    tier: RateLimitTier | 'SMS_IP' | 'SMS_USER',
    identifier: string
  ): Promise<RateLimitResult> {
    try {
      const rateLimiter = this.rateLimiters.get(tier);
      
      if (!rateLimiter) {
        console.error(`Rate limiter not found for tier: ${tier}`);
        // Fallback gracieux - permet la requête
        return {
          success: true,
          limit: 0,
          remaining: 0,
          reset: Date.now() + 60000
        };
      }

      const key = this.generateKey(tier, identifier);
      const result = await rateLimiter.limit(key);

      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      
      // Fallback gracieux en cas d'erreur Redis
      return {
        success: true,
        limit: 0,
        remaining: 0,
        reset: Date.now() + 60000
      };
    }
  }

  /**
   * Vérifie les limites SMS (combinant IP + utilisateur)
   */
  public async checkSMSLimits(
    ip: string, 
    userId?: string
  ): Promise<{ ipLimit: RateLimitResult; userLimit?: RateLimitResult }> {
    const results: { ipLimit: RateLimitResult; userLimit?: RateLimitResult } = {
      ipLimit: await this.checkLimit('SMS_IP', ip)
    };

    if (userId) {
      results.userLimit = await this.checkLimit('SMS_USER', userId);
    }

    return results;
  }

  /**
   * Remet à zéro les limites pour une clé donnée
   */
  public async resetLimit(tier: RateLimitTier | 'SMS_IP' | 'SMS_USER', identifier: string): Promise<void> {
    try {
      const key = this.generateKey(tier, identifier);
      await this.redis.del(key);
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      // Erreur silencieuse - la limite se réinitialisera naturellement
    }
  }

  /**
   * Obtient les statistiques de rate limiting pour un identifiant
   */
  public async getRateLimitStats(
    tier: RateLimitTier | 'SMS_IP' | 'SMS_USER', 
    identifier: string
  ): Promise<{ remaining: number; reset: number } | null> {
    try {
      const key = this.generateKey(tier, identifier);
      const rateLimiter = this.rateLimiters.get(tier);
      
      if (!rateLimiter) {
        return null;
      }

      // Effectuer un "dry run" pour obtenir les stats sans incrémenter
      const result = await rateLimiter.limit(key);
      
      return {
        remaining: result.remaining + 1, // +1 car on vient de décrémenter
        reset: result.reset
      };
    } catch (error) {
      console.error('Error getting rate limit stats:', error);
      return null;
    }
  }

  /**
   * Test de santé du service Redis
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}

// Instance singleton du service
let rateLimitService: RateLimitService | null = null;

/**
 * Obtient l'instance singleton du service de rate limiting
 */
export function getRateLimitService(): RateLimitService {
  if (!rateLimitService) {
    rateLimitService = new RateLimitService();
  }
  return rateLimitService;
}

// Export des utilitaires pour les middlewares
export const rateLimitUtils = {
  /**
   * Extrait l'IP de la requête
   */
  extractIP(request: Request): string {
    // En production, utiliser les headers des proxies/CDN
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfIP = request.headers.get('cf-connecting-ip');
    
    return cfIP || realIP || forwardedFor?.split(',')[0] || 'unknown';
  },

  /**
   * Extrait l'ID utilisateur des headers d'autorisation
   */
  extractUserID(request: Request): string | null {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    // TODO: Décoder le JWT pour extraire l'ID utilisateur
    // Pour l'instant, retourne null - sera implémenté avec Supabase auth
    return null;
  },

  /**
   * Crée les headers de réponse pour le rate limiting
   */
  createRateLimitHeaders(result: RateLimitResult): Headers {
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', result.limit.toString());
    headers.set('X-RateLimit-Remaining', result.remaining.toString());
    headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());
    return headers;
  },

  /**
   * Crée une réponse 429 avec les bonnes informations
   */
  createTooManyRequestsResponse(result: RateLimitResult, message?: string): Response {
    const defaultMessage = 'Trop de requêtes. Veuillez réessayer plus tard.';
    const headers = rateLimitUtils.createRateLimitHeaders(result);
    
    return new Response(
      JSON.stringify({ 
        error: 'RATE_LIMIT_EXCEEDED',
        message: message || defaultMessage,
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: (() => {
          const responseHeaders = new Headers();
          headers.forEach((value, key) => {
            responseHeaders.set(key, value);
          });
          responseHeaders.set('Content-Type', 'application/json');
          return responseHeaders;
        })()
      }
    );
  }
};

export default RateLimitService;
