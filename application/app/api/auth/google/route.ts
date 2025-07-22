import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { securityLogger, SecurityHeaders, SecurityEventType, SecurityEventSeverity } from '@/lib/security-logger';
import { authConfig } from '@/auth';

const MIN_RESPONSE_TIME = 150;

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

  // Vérifier que Google OAuth est activé
  if (!authConfig.socialProviders.google.enabled) {
    return NextResponse.json({ error: 'Google OAuth désactivé' }, { status: 403 });
  }

  // Log de tentative OAuth
  await securityLogger.logSecurityEvent(
    SecurityEventType.OAUTH_ATTEMPT,
    SecurityEventSeverity.INFO,
    req,
    { provider: 'google' }
  );

  // Lancer le flow OAuth Supabase
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`
    }
  });

  if (error) {
    // Log d'échec OAuth
    await securityLogger.logSecurityEvent(
      SecurityEventType.OAUTH_FAILED,
      SecurityEventSeverity.WARNING,
      req,
      { provider: 'google', error: error.message }
    );

    // Réponse d'erreur avec délai minimal
    const response = await ensureMinimumResponseTime(
      Promise.resolve(
        NextResponse.json(
          { error: 'OAuth Google échoué' },
          { status: 400 }
        )
      ),
      startTime
    );
    SecurityHeaders.addSecurityHeaders(response);
    return response;
  }

  // Réponse de succès avec URL de redirection
  const response = await ensureMinimumResponseTime(
    Promise.resolve(
      NextResponse.json({ url: data.url })
    ),
    startTime
  );
  SecurityHeaders.addSecurityHeaders(response);
  return response;
}
