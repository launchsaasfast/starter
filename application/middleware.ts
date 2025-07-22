/**
 * Middleware de rate limiting Next.js
 * Intercepte les requêtes API et applique les vérifications de rate limiting
 * Utilise Edge Runtime pour des performances optimales
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitService, RateLimitTier, rateLimitUtils } from '@/lib/rate-limit';

/**
 * Configuration des routes à protéger et leurs tiers de rate limiting
 */
const PROTECTED_ROUTES = {
  // Routes d'authentification - tier AUTH_OPERATIONS
  '/api/auth/signin': RateLimitTier.AUTH_OPERATIONS,
  '/api/auth/signup': RateLimitTier.AUTH_OPERATIONS,
  '/api/auth/logout': RateLimitTier.AUTH_OPERATIONS,
  '/api/auth/reset-password': RateLimitTier.AUTH_OPERATIONS,
  '/api/auth/verify': RateLimitTier.AUTH_OPERATIONS,
  
  // Routes SMS - tier SMS_OPERATIONS (gestion spéciale)
  '/api/sms/send': RateLimitTier.SMS_OPERATIONS,
  '/api/sms/verify': RateLimitTier.SMS_OPERATIONS,
  
  // Routes de données sensibles - tier DATA_EXPORTS
  '/api/data/export': RateLimitTier.DATA_EXPORTS,
  '/api/admin/export': RateLimitTier.DATA_EXPORTS,
  '/api/analytics/export': RateLimitTier.DATA_EXPORTS,
  
  // Routes générales authentifiées - tier AUTHENTICATED_OPERATIONS
  '/api/user/profile': RateLimitTier.AUTHENTICATED_OPERATIONS,
  '/api/user/settings': RateLimitTier.AUTHENTICATED_OPERATIONS,
  '/api/dashboard': RateLimitTier.AUTHENTICATED_OPERATIONS,
} as const;

/**
 * Patterns de routes pour protection générale
 */
const GENERAL_PROTECTION_PATTERNS = [
  '/api/',  // Toutes les routes API non spécifiquement configurées
];

/**
 * Extrait l'ID utilisateur des headers d'autorisation
 */
function extractUserIdFromAuth(request: NextRequest): string | null {
  try {
    // Vérification du header Authorization Bearer
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Pour Supabase, on peut décoder le JWT pour obtenir l'user ID
      // Ici, on utilise une approche simplifiée - dans un vrai projet,
      // il faudrait décoder proprement le JWT Supabase
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        try {
          const payload = JSON.parse(atob(tokenParts[1]));
          return payload.sub || payload.user_id || null;
        } catch {
          // Token invalide, on continue sans user ID
        }
      }
    }
    
    // Vérification des cookies de session Supabase
    const sessionCookie = request.cookies.get('supabase-auth-token');
    if (sessionCookie) {
      // Extraction simplifiée - en production, utiliser la lib Supabase
      try {
        const sessionData = JSON.parse(sessionCookie.value);
        return sessionData.user?.id || null;
      } catch {
        // Cookie invalide, on continue sans user ID
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Erreur lors de l\'extraction de l\'user ID:', error);
    return null;
  }
}

/**
 * Détermine le tier de rate limiting approprié pour une route
 */
function determineRateLimitTier(pathname: string): RateLimitTier | null {
  // Vérification des routes exactes
  if (PROTECTED_ROUTES[pathname as keyof typeof PROTECTED_ROUTES]) {
    return PROTECTED_ROUTES[pathname as keyof typeof PROTECTED_ROUTES];
  }
  
  // Vérification des patterns généraux
  for (const pattern of GENERAL_PROTECTION_PATTERNS) {
    if (pathname.startsWith(pattern)) {
      return RateLimitTier.GENERAL_PROTECTION;
    }
  }
  
  return null;
}

/**
 * Middleware principal de rate limiting
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Ignorer les fichiers statiques et les routes non-API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }
  
  // Déterminer si la route nécessite du rate limiting
  const rateLimitTier = determineRateLimitTier(pathname);
  if (!rateLimitTier) {
    return NextResponse.next();
  }
  
  try {
    const rateLimitService = getRateLimitService();
    
    // Extraction des identifiants
    const clientIP = rateLimitUtils.extractIP(request);
    const userID = extractUserIdFromAuth(request);
    
    console.log(`[Rate Limit] ${pathname} - IP: ${clientIP}, User: ${userID || 'anonymous'}, Tier: ${rateLimitTier}`);
    
    // Logique spéciale pour les opérations SMS
    if (rateLimitTier === RateLimitTier.SMS_OPERATIONS) {
      const smsLimits = await rateLimitService.checkSMSLimits(clientIP, userID || undefined);
      
      // Vérifier si l'une des limites SMS est dépassée
      if (!smsLimits.ipLimit.success) {
        return rateLimitUtils.createTooManyRequestsResponse(
          smsLimits.ipLimit,
          'Trop de SMS envoyés depuis cette IP. Essayez plus tard.'
        );
      }
      
      if (userID && smsLimits.userLimit && !smsLimits.userLimit.success) {
        return rateLimitUtils.createTooManyRequestsResponse(
          smsLimits.userLimit,
          'Quota SMS utilisateur épuisé. Attendez avant de réessayer.'
        );
      }
      
      // Ajouter les headers pour les limites SMS
      const response = NextResponse.next();
      const ipHeaders = rateLimitUtils.createRateLimitHeaders(smsLimits.ipLimit);
      
      // Ajouter les headers IP
      ipHeaders.forEach((value, key) => {
        response.headers.set(`${key}-IP`, value);
      });
      
      // Ajouter les headers utilisateur si disponibles
      if (userID && smsLimits.userLimit) {
        const userHeaders = rateLimitUtils.createRateLimitHeaders(smsLimits.userLimit);
        userHeaders.forEach((value, key) => {
          response.headers.set(`${key}-User`, value);
        });
      }
      
      // Ajouter les headers IP
      ipHeaders.forEach((value, key) => {
        response.headers.set(`${key}-IP`, value);
      });
      
      // Ajouter les headers utilisateur si disponibles
      if (userID) {
        userHeaders.forEach((value, key) => {
          response.headers.set(`${key}-User`, value);
        });
      }
      
      return response;
    }
    
    // Logique standard pour les autres tiers
    let rateLimitKey = clientIP;
    
    // Pour les opérations authentifiées, utiliser l'user ID si disponible
    if (rateLimitTier === RateLimitTier.AUTHENTICATED_OPERATIONS && userID) {
      rateLimitKey = userID;
    } else if (rateLimitTier === RateLimitTier.DATA_EXPORTS && userID) {
      rateLimitKey = userID; // Les exports sont limités par utilisateur
    }
    
    // Vérification de la limite
    const rateLimitResult = await rateLimitService.checkLimit(rateLimitTier, rateLimitKey);
    
    // Si la limite est dépassée
    if (!rateLimitResult.success) {
      const headers = rateLimitUtils.createRateLimitHeaders(rateLimitResult);
      
      // Messages personnalisés selon le tier
      let errorMessage = 'Trop de requêtes. Essayez plus tard.';
      
      switch (rateLimitTier) {
        case RateLimitTier.AUTH_OPERATIONS:
          errorMessage = 'Trop de tentatives d\'authentification. Attendez 10 secondes.';
          break;
        case RateLimitTier.DATA_EXPORTS:
          errorMessage = 'Quota d\'export quotidien atteint. Réessayez demain.';
          break;
        case RateLimitTier.AUTHENTICATED_OPERATIONS:
          errorMessage = 'Trop d\'opérations. Attendez une minute.';
          break;
        case RateLimitTier.GENERAL_PROTECTION:
          errorMessage = 'Trop de requêtes API. Ralentissez vos requêtes.';
          break;
      }
      
      return rateLimitUtils.createTooManyRequestsResponse(
        rateLimitResult,
        errorMessage,
        headers
      );
    }
    
    // Ajouter les headers de rate limiting à la réponse
    const response = NextResponse.next();
    const headers = rateLimitUtils.createRateLimitHeaders(rateLimitResult);
    
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error) {
    // En cas d'erreur (ex: Redis indisponible), on laisse passer la requête
    // pour éviter de bloquer le service entier
    console.error('[Rate Limit] Erreur dans le middleware:', error);
    
    // Ajouter un header indiquant le mode de fallback
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Status', 'fallback');
    
    return response;
  }
}

/**
 * Configuration du matcher pour cibler les bonnes routes
 * Utilise Edge Runtime pour de meilleures performances
 */
export const config = {
  // Matcher optimisé pour intercepter seulement les routes API nécessaires
  matcher: [
    /*
     * Intercepter toutes les routes API sauf:
     * - Routes statiques (_next/static, images, etc.)
     * - Routes de sanity check et health
     * - Fichiers avec extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|health|status).*)',
    '/(api|trpc)(.*)',
  ],
  
  // Utiliser Edge Runtime pour de meilleures performances
  runtime: 'edge',
};

/**
 * Export des utilitaires pour les tests
 */
export { determineRateLimitTier, extractUserIdFromAuth, PROTECTED_ROUTES };
