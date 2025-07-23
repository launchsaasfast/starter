/**
 * Service de logging des événements de sécurité
 * Enregistre les tentatives d'authentification et les violations de rate limiting
 */

import { supabase } from '@/lib/supabaseClient';
import { rateLimitUtils } from '@/lib/rate-limit';

/**
 * Types d'événements de sécurité
 */
export enum SecurityEventType {
  // Événements d'authentification
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  
  // Événements d'enregistrement
  SIGNUP_ATTEMPT = 'SIGNUP_ATTEMPT',
  SIGNUP_SUCCESS = 'SIGNUP_SUCCESS',
  SIGNUP_FAILED = 'SIGNUP_FAILED',
  // Événements de réinitialisation de mot de passe
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  PASSWORD_RESET_FAILED = 'PASSWORD_RESET_FAILED',
  
  // Événements de déconnexion
  LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',

  // Événements OAuth
  OAUTH_ATTEMPT = 'OAUTH_ATTEMPT',
  OAUTH_SUCCESS = 'OAUTH_SUCCESS',
  OAUTH_FAILED = 'OAUTH_FAILED',

  // Événements de rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_WARNING = 'RATE_LIMIT_WARNING',
  
  // Événements suspect
  BRUTE_FORCE_DETECTED = 'BRUTE_FORCE_DETECTED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  // Événements de changement d'email
  EMAIL_CHANGE_REQUEST = 'EMAIL_CHANGE_REQUEST',
  EMAIL_CHANGE_FAILED = 'EMAIL_CHANGE_FAILED',
}

/**
 * Niveau de sévérité des événements
 */
export enum SecurityEventSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Interface pour les événements de sécurité
 */
export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  ip_address: string;
  user_agent?: string;
  user_id?: string;
  email?: string;
  details: Record<string, unknown>;
  timestamp: string;
}

/**
 * Service de logging des événements de sécurité
 */
class SecurityLogger {
  private static instance: SecurityLogger;

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Enregistre un événement de sécurité
   */
  async logSecurityEvent(
    type: SecurityEventType,
    severity: SecurityEventSeverity,
    request: Request,
    details: Record<string, unknown> = {},
    userId?: string,
    email?: string
  ): Promise<void> {
    try {
      const event: SecurityEvent = {
        type,
        severity,
        ip_address: rateLimitUtils.extractIP(request),
        user_agent: request.headers.get('user-agent') || undefined,
        user_id: userId,
        email,
        details: {
          ...details,
          url: request.url,
          method: request.method,
          timestamp_iso: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };

      // Log vers la console en développement
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Security] ${severity} - ${type}:`, {
          ip: event.ip_address,
          user: userId || 'anonymous',
          details: event.details
        });
      }

      // Enregistrer dans Supabase (table security_events)
      const { error } = await supabase
        .from('security_events')
        .insert([{
          event_type: event.type,
          severity: event.severity,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          user_id: event.user_id,
          email: event.email,
          details: event.details,
          created_at: event.timestamp
        }]);

      if (error) {
        // En cas d'erreur DB, au moins logger en console
        console.error('Erreur lors de l\'enregistrement de l\'événement de sécurité:', error);
        console.log('Événement non enregistré:', event);
      }
    } catch (error) {
      // Ne pas faire échouer la requête principale si le logging échoue
      console.error('Erreur critique dans SecurityLogger:', error);
    }
  }

  /**
   * Log des tentatives de connexion
   */
  async logLoginAttempt(
    request: Request,
    email: string,
    success: boolean,
    error?: string,
    userId?: string
  ): Promise<void> {
    const type = success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED;
    const severity = success ? SecurityEventSeverity.INFO : SecurityEventSeverity.WARNING;
    
    await this.logSecurityEvent(
      type,
      severity,
      request,
      {
        email,
        success,
        error_message: error,
        attempt_type: 'password_login'
      },
      userId,
      email
    );
  }

  /**
   * Log des tentatives d'enregistrement
   */
  async logSignupAttempt(
    request: Request,
    email: string,
    success: boolean,
    error?: string,
    userId?: string
  ): Promise<void> {
    const type = success ? SecurityEventType.SIGNUP_SUCCESS : SecurityEventType.SIGNUP_FAILED;
    const severity = success ? SecurityEventSeverity.INFO : SecurityEventSeverity.WARNING;
    
    await this.logSecurityEvent(
      type,
      severity,
      request,
      {
        email,
        success,
        error_message: error,
        signup_method: 'email_password'
      },
      userId,
      email
    );
  }

  /**
   * Log des déconnexions
   */
  async logLogout(
    request: Request,
    userId?: string,
    email?: string
  ): Promise<void> {
    await this.logSecurityEvent(
      SecurityEventType.LOGOUT_SUCCESS,
      SecurityEventSeverity.INFO,
      request,
      {
        logout_method: 'manual'
      },
      userId,
      email
    );
  }

  /**
   * Log des violations de rate limiting
   */
  async logRateLimitExceeded(
    request: Request,
    tier: string,
    limit: number,
    remaining: number,
    userId?: string
  ): Promise<void> {
    await this.logSecurityEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecurityEventSeverity.ERROR,
      request,
      {
        rate_limit_tier: tier,
        limit,
        remaining,
        blocked: true
      },
      userId
    );
  }

  /**
   * Log des activités suspectes (multiple échecs successifs)
   */
  async logSuspiciousActivity(
    request: Request,
    activityType: string,
    details: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    await this.logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventSeverity.CRITICAL,
      request,
      {
        activity_type: activityType,
        ...details
      },
      userId
    );
  }

  /**
   * Log spécifique pour les déconnexions réussies
   */
  async logLogoutSuccess(
    userId?: string,
    email?: string,
    request?: Request
  ): Promise<void> {
    if (request) {
      await this.logSecurityEvent(
        SecurityEventType.LOGOUT_SUCCESS,
        SecurityEventSeverity.INFO,
        request,
        {
          logout_method: 'success'
        },
        userId,
        email
      );
    }
  }
}

/**
 * Instance singleton du logger de sécurité
 */
export const securityLogger = SecurityLogger.getInstance();

/**
 * Utilitaires pour les messages d'erreur standardisés
 */
export class SecurityMessages {
  /**
   * Messages d'erreur pour rate limiting
   */
  static getRateLimitMessage(resetTimeSeconds: number): string {
    if (resetTimeSeconds < 60) {
      return `Trop de tentatives. Veuillez réessayer dans ${resetTimeSeconds} secondes.`;
    } else if (resetTimeSeconds < 3600) {
      const minutes = Math.ceil(resetTimeSeconds / 60);
      return `Trop de tentatives. Veuillez réessayer dans ${minutes} minute${minutes > 1 ? 's' : ''}.`;
    } else {
      const hours = Math.ceil(resetTimeSeconds / 3600);
      return `Trop de tentatives. Veuillez réessayer dans ${hours} heure${hours > 1 ? 's' : ''}.`;
    }
  }

  /**
   * Message générique pour authentification échouée
   */
  static getAuthFailedMessage(): string {
    return 'Email ou mot de passe incorrect.';
  }

  /**
   * Message pour erreur d'enregistrement
   */
  static getSignupFailedMessage(error?: string): string {
    // Ne pas révéler les détails techniques
    if (error?.includes('already registered') || error?.includes('email')) {
      return 'Cette adresse email est déjà utilisée.';
    }
    return 'Erreur lors de la création du compte. Veuillez réessayer.';
  }
}

/**
 * Headers de sécurité supplémentaires
 */
export class SecurityHeaders {
  /**
   * Ajoute les headers de sécurité aux réponses
   */
  static addSecurityHeaders(response: Response): void {
    // Prévenir les attaques de timing
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    // Cache control pour les endpoints sensibles
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
}

export default SecurityLogger;
