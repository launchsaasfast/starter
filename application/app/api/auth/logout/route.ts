import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { 
  securityLogger, 
  SecurityHeaders,
  SecurityEventType,
  SecurityEventSeverity 
} from '@/lib/security-logger';

/**
 * Délai minimum de réponse pour éviter les attaques de timing
 */
async function ensureMinimumResponseTime(startTime: number, minMs: number = 100): Promise<void> {
  const elapsed = Date.now() - startTime;
  if (elapsed < minMs) {
    await new Promise(resolve => setTimeout(resolve, minMs - elapsed));
  }
}

/**
 * Extrait l'user ID du token d'autorisation
 */
function extractUserFromAuth(request: NextRequest): { userId?: string; email?: string } {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        try {
          const payload = JSON.parse(atob(tokenParts[1]));
          return {
            userId: payload.sub || payload.user_id,
            email: payload.email
          };
        } catch {
          // Token invalide
        }
      }
    }
    return {};
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Initialisation du client Supabase avec la nouvelle API SSR
    const supabase = await createServerSupabaseClient();
    
    // Extraction des infos utilisateur avant déconnexion
    const userInfo = extractUserFromAuth(req);
    
    // Log de tentative de déconnexion
    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGOUT_SUCCESS,
      SecurityEventSeverity.INFO,
      req,
      { 
        method: 'api_logout',
        user_agent: req.headers.get('user-agent') || 'unknown'
      },
      userInfo.userId,
      userInfo.email
    );

    // Déconnexion via Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      // Log de l'erreur de déconnexion
      await securityLogger.logSecurityEvent(
        SecurityEventType.LOGOUT_SUCCESS,
        SecurityEventSeverity.WARNING,
        req,
        { 
          error: 'logout_failed',
          message: error.message,
          supabase_error: true
        },
        userInfo.userId,
        userInfo.email
      );

      // Assurer le délai minimum avant réponse
      await ensureMinimumResponseTime(startTime);

      const response = NextResponse.json(
        { error: 'Erreur lors de la déconnexion. Veuillez réessayer.' },
        { status: 500 }
      );

      SecurityHeaders.addSecurityHeaders(response);
      return response;
    }

    // Log de succès de déconnexion
    await securityLogger.logLogoutSuccess(
      userInfo.userId,
      userInfo.email,
      req
    );

    // Assurer le délai minimum avant réponse
    await ensureMinimumResponseTime(startTime);

    // Création de la réponse de succès
    const response = NextResponse.json({
      success: true,
      message: 'Déconnexion réussie.'
    });

    // Ajouter les headers de sécurité
    SecurityHeaders.addSecurityHeaders(response);
    
    // Headers spécifiques pour la déconnexion
    response.headers.set('Clear-Site-Data', '"cache", "cookies", "storage"');
    
    return response;

  } catch (error) {
    // Log des erreurs inattendues
    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGOUT_SUCCESS,
      SecurityEventSeverity.ERROR,
      req,
      { 
        error: 'unexpected_error',
        message: error instanceof Error ? error.message : 'unknown_error'
      }
    );

    // Assurer le délai minimum avant réponse
    await ensureMinimumResponseTime(startTime);

    // Réponse d'erreur générique avec SecurityMessages
    const response = NextResponse.json(
      { error: 'Une erreur est survenue lors de la déconnexion.' },
      { status: 500 }
    );

    SecurityHeaders.addSecurityHeaders(response);
    return response;
  }
}
