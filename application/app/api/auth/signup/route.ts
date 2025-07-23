import { NextRequest, NextResponse } from 'next/server';
import { 
  securityLogger, 
  SecurityMessages, 
  SecurityHeaders,
  SecurityEventType,
  SecurityEventSeverity 
} from '@/lib/security-logger';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { AUTH_CONFIG } from '@/auth';

/**
 * Délai minimum pour les réponses (prévention des attaques de timing)
 */
const MIN_RESPONSE_TIME = 100; // ms

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

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let email: string = '';
  
  try {
    // Initialisation du client Supabase avec la nouvelle API SSR
    const supabase = await createServerSupabaseClient();
    
    // Validation des données d'entrée
    const body = await req.json();
    
    if (!body.email || !body.password) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.SIGNUP_ATTEMPT,
        SecurityEventSeverity.WARNING,
        req,
        { 
          error: 'missing_fields',
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

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.SIGNUP_ATTEMPT,
        SecurityEventSeverity.WARNING,
        req,
        { 
          error: 'invalid_email_format',
          email: email.substring(0, 3) + '***' // Masquer l'email dans les logs
        }
      );
      
      return await ensureMinimumResponseTime(
        Promise.resolve(NextResponse.json(
          { error: 'Format d\'email invalide.' },
          { status: 400 }
        )),
        startTime
      );
    }

    // Validation du mot de passe
    if (password.length < 8) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.SIGNUP_ATTEMPT,
        SecurityEventSeverity.WARNING,
        req,
        { 
          error: 'password_too_short',
          length: password.length
        }
      );
      
      return await ensureMinimumResponseTime(
        Promise.resolve(NextResponse.json(
          { error: 'Le mot de passe doit contenir au moins 8 caractères.' },
          { status: 400 }
        )),
        startTime
      );
    }

    // Log de tentative d'enregistrement
    await securityLogger.logSecurityEvent(
      SecurityEventType.SIGNUP_ATTEMPT,
      SecurityEventSeverity.INFO,
      req,
      { email }
    );

    // Tentative d'enregistrement via Supabase
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: AUTH_CONFIG.supabase.redirectTo.signup,
        data: {
          signup_ip: req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown',
          signup_user_agent: req.headers.get('user-agent') || 'unknown'
        }
      }
    });

    if (error) {
      // Log de l'échec d'enregistrement
      await securityLogger.logSignupAttempt(
        req,
        email,
        false,
        error.message
      );

      // Message d'erreur standardisé (ne révèle pas les détails techniques)
      const userMessage = SecurityMessages.getSignupFailedMessage(error.message);
      
      return await ensureMinimumResponseTime(
        Promise.resolve(NextResponse.json(
          { error: userMessage },
          { status: 400 }
        )),
        startTime
      );
    }

    // Log de succès d'enregistrement
    await securityLogger.logSignupAttempt(
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
          email_confirmed_at: data.user?.email_confirmed_at
        },
        session: data.session ? {
          access_token: data.session.access_token,
          expires_at: data.session.expires_at
        } : null,
        message: data.user?.email_confirmed_at ? 
          'Compte créé avec succès.' : 
          'Compte créé. Vérifiez votre email pour activer votre compte.'
      })),
      startTime
    );

    // Ajouter les headers de sécurité
    SecurityHeaders.addSecurityHeaders(response);
    
    return response;

  } catch (error) {
    // Log des erreurs inattendues
    await securityLogger.logSecurityEvent(
      SecurityEventType.SIGNUP_FAILED,
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
