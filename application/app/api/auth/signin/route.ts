import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  securityLogger, 
  SecurityMessages, 
  SecurityHeaders,
  SecurityEventType,
  SecurityEventSeverity 
} from '@/lib/security-logger';
import { createServerSupabaseClient, supabase } from '@/lib/supabaseClient';

/**
 * Délai minimum pour les réponses (prévention des attaques de timing)
 */
const MIN_RESPONSE_TIME = 150; // ms, plus long pour signin

/**
 * Configuration pour la détection de brute force
 */
const BRUTE_FORCE_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes en ms
  SUSPICIOUS_THRESHOLD: 3
};

/**
 * Fonction utilitaire pour introduire un délai minimal
 */
async function ensureMinimumResponseTime<T>(
  promise: Promise<T>,
  startTime: number
): Promise<T> {
  const [result] = await Promise.all([
    promise,
    new Promise(resolve => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_RESPONSE_TIME - elapsed);
      setTimeout(resolve, remaining);
    })
  ]);
  return result;
}

/**
 * Vérifie les tentatives de connexion récentes pour détecter le brute force
 */
async function checkBruteForceAttempts(ip: string, email?: string): Promise<{
  isBlocked: boolean;
  remainingAttempts: number;
  lockoutEndsAt?: Date;
}> {
  try {
    // Utiliser la fonction sécurisée pour contourner les restrictions RLS
    const { data: bruteForceResult, error } = await supabase
      .rpc('check_brute_force_attempts', {
        check_ip: ip,
        check_email: email || null,
        lookback_minutes: Math.floor(BRUTE_FORCE_CONFIG.LOCKOUT_DURATION / (60 * 1000)),
        max_attempts: BRUTE_FORCE_CONFIG.MAX_FAILED_ATTEMPTS
      });

    if (error) {
      console.error('Erreur lors de la vérification brute force:', error);
      return { isBlocked: false, remainingAttempts: BRUTE_FORCE_CONFIG.MAX_FAILED_ATTEMPTS };
    }

    const result = bruteForceResult?.[0];
    if (!result) {
      return { isBlocked: false, remainingAttempts: BRUTE_FORCE_CONFIG.MAX_FAILED_ATTEMPTS };
    }

    const failedAttempts = result.failed_attempts || 0;
    const remainingAttempts = Math.max(0, BRUTE_FORCE_CONFIG.MAX_FAILED_ATTEMPTS - failedAttempts);

    if (result.is_blocked) {
      return { 
        isBlocked: true, 
        remainingAttempts: result.remaining_attempts || 0, 
        lockoutEndsAt: result.lockout_ends_at ? new Date(result.lockout_ends_at) : undefined
      };
    }

    return { isBlocked: false, remainingAttempts: result.remaining_attempts || remainingAttempts };
  } catch (error) {
    console.error('Erreur dans checkBruteForceAttempts:', error);
    return { isBlocked: false, remainingAttempts: BRUTE_FORCE_CONFIG.MAX_FAILED_ATTEMPTS };
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let email: string = '';
  
  try {
    // Initialisation du client Supabase avec la nouvelle API SSR
    const supabaseClient = await createServerSupabaseClient();
    
    // Validation des données d'entrée
    const body = await req.json();
    
    if (!body.email || !body.password) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.LOGIN_ATTEMPT,
        SecurityEventSeverity.WARNING,
        req,
        { 
          error: 'missing_credentials',
          provided_fields: Object.keys(body)
        }
      );
      
      return await ensureMinimumResponseTime(
        Promise.resolve(NextResponse.json(
          { error: 'Email et mot de passe requis.' },
          { status: 400 }
        )),
        startTime
      );
    }

    email = body.email.toLowerCase().trim();
    const { password } = body;

    // Extraction de l'IP pour vérification brute force
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    req.headers.get('cf-connecting-ip') || 
                    'unknown';

    // Vérification des tentatives de brute force
    // SOLUTION TEMPORAIRE: Désactivation jusqu'au déploiement de la fonction PostgreSQL
    // TODO: Déployez sql/fix_security_permissions.sql dans Supabase puis décommentez
    
    let bruteForceCheck: {
      isBlocked: boolean;
      remainingAttempts: number;
      lockoutEndsAt?: Date;
    } = { isBlocked: false, remainingAttempts: 5 };
    
    /* TEMPORAIREMENT DÉSACTIVÉ - décommentez après déploiement SQL
    try {
      bruteForceCheck = await checkBruteForceAttempts(clientIP, email);
    } catch (error) {
      console.warn('Vérification brute force échouée (utilisation fallback):', error);
      bruteForceCheck = { isBlocked: false, remainingAttempts: 5 };
    }
    */
    
    if (bruteForceCheck.isBlocked) {
      const lockoutSeconds = bruteForceCheck.lockoutEndsAt ? 
        Math.ceil((bruteForceCheck.lockoutEndsAt.getTime() - Date.now()) / 1000) : 900;
      
      await securityLogger.logSecurityEvent(
        SecurityEventType.BRUTE_FORCE_DETECTED,
        SecurityEventSeverity.CRITICAL,
        req,
        { 
          ip: clientIP,
          email,
          blocked: true,
          lockout_ends_at: bruteForceCheck.lockoutEndsAt?.toISOString(),
          remaining_seconds: lockoutSeconds
        }
      );
      
      return await ensureMinimumResponseTime(
        Promise.resolve(NextResponse.json(
          { 
            error: SecurityMessages.getRateLimitMessage(lockoutSeconds),
            blocked: true,
            retry_after: lockoutSeconds
          },
          { status: 429 }
        )),
        startTime
      );
    }

    // Warning si proche de la limite
    if (bruteForceCheck.remainingAttempts <= BRUTE_FORCE_CONFIG.SUSPICIOUS_THRESHOLD) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecurityEventSeverity.WARNING,
        req,
        { 
          activity_type: 'repeated_login_failures',
          remaining_attempts: bruteForceCheck.remainingAttempts,
          ip: clientIP,
          email
        }
      );
    }

    // Log de tentative de connexion
    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGIN_ATTEMPT,
      SecurityEventSeverity.INFO,
      req,
      { 
        email,
        remaining_attempts: bruteForceCheck.remainingAttempts
      }
    );

    // Tentative de connexion via Supabase
    const { data, error } = await supabaseClient.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) {
      // Log de l'échec de connexion
      await securityLogger.logLoginAttempt(
        req,
        email,
        false,
        error.message
      );

      // Message d'erreur standardisé (ne révèle pas si l'utilisateur existe)
      const userMessage = SecurityMessages.getAuthFailedMessage();
      
      return await ensureMinimumResponseTime(
        Promise.resolve(NextResponse.json(
          { 
            error: userMessage,
            remaining_attempts: bruteForceCheck.remainingAttempts - 1
          },
          { status: 401 }
        )),
        startTime
      );
    }

    // Log de succès de connexion
    await securityLogger.logLoginAttempt(
      req,
      email,
      true,
      undefined,
      data.user?.id
    );

    // Création de la réponse de succès
    const response = await ensureMinimumResponseTime(
      Promise.resolve(NextResponse.json({
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          email_confirmed_at: data.user?.email_confirmed_at,
          last_sign_in_at: data.user?.last_sign_in_at
        },
        message: 'Connexion réussie.'
      })),
      startTime
    );

    // Ajouter les headers de sécurité
    SecurityHeaders.addSecurityHeaders(response);
    
    return response;

  } catch (error) {
    // Log des erreurs inattendues
    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGIN_FAILED,
      SecurityEventSeverity.ERROR,
      req,
      { 
        error: 'unexpected_error',
        message: error instanceof Error ? error.message : 'unknown_error'
      },
      undefined,
      email
    );

    // Réponse d'erreur générique
    return await ensureMinimumResponseTime(
      Promise.resolve(NextResponse.json(
        { error: 'Une erreur est survenue. Veuillez réessayer.' },
        { status: 500 }
      )),
      startTime
    );
  }
}
