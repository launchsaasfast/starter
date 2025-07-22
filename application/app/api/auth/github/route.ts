import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { securityLogger, SecurityHeaders, SecurityEventType, SecurityEventSeverity } from '@/lib/security-logger';
import { authConfig } from '@/config/auth';

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

  // Vérifier que GitHub OAuth est activé
  if (!authConfig.socialProviders.github.enabled) {
    return NextResponse.json({ error: 'GitHub OAuth désactivé' }, { status: 403 });
  }

  // Log de tentative OAuth GitHub
  await securityLogger.logSecurityEvent(
    SecurityEventType.OAUTH_ATTEMPT,
    SecurityEventSeverity.INFO,
    req,
    { provider: 'github' }
  );

  // Lancer le flow OAuth Supabase pour GitHub
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      scopes: 'user:email'
    }
  });

  if (error) {
    // Log d'échec OAuth GitHub
    await securityLogger.logSecurityEvent(
      SecurityEventType.OAUTH_FAILED,
      SecurityEventSeverity.WARNING,
      req,
      { provider: 'github', error: error.message }
    );

    // Réponse d'erreur avec délai minimal
    const response = await ensureMinimumResponseTime(
      Promise.resolve(
        NextResponse.json({ error: 'OAuth GitHub échoué' }, { status: 400 })
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
