import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { AUTH_CONFIG } from '@/auth';
import {
  securityLogger,
  SecurityEventType,
  SecurityEventSeverity,
  SecurityHeaders
} from '@/lib/security-logger';

const MIN_RESPONSE_TIME = 150; // ms

/**
 * Utility to ensure a minimum response time
 */
async function ensureMinimumResponseTime<T>(
  promise: Promise<T>,
  startTime: number
): Promise<T> {
  const [result] = await Promise.all([
    promise,
    new Promise<void>(resolve => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_RESPONSE_TIME - elapsed);
      setTimeout(resolve, remaining);
    })
  ]);
  return result;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    // 1. Create Supabase server client with session
    const supabase = await createServerSupabaseClient();

    // 2. Check authentication via session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const response = NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
      SecurityHeaders.addSecurityHeaders(response);
      return await ensureMinimumResponseTime(Promise.resolve(response), startTime);
    }

    // 3. Input validation
    const body = await req.json();
    const { newEmail, currentPassword } = body;
    if (!newEmail || !currentPassword) {
      const response = NextResponse.json(
        { error: 'Nouvel email et mot de passe requis' },
        { status: 400 }
      );
      SecurityHeaders.addSecurityHeaders(response);
      return await ensureMinimumResponseTime(Promise.resolve(response), startTime);
    }

    // 4. Verify current password by attempting sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (verifyError) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.EMAIL_CHANGE_FAILED,
        SecurityEventSeverity.WARNING,
        req,
        { reason: 'invalid_password', user_id: user.id }
      );
      const response = NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
      SecurityHeaders.addSecurityHeaders(response);
      return await ensureMinimumResponseTime(Promise.resolve(response), startTime);
    }

    // 5. Update user email
    const { error: updateError } = await supabase.auth.updateUser({ email: newEmail });
    if (updateError) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.EMAIL_CHANGE_FAILED,
        SecurityEventSeverity.ERROR,
        req,
        { error: updateError.message, user_id: user.id }
      );
      const response = NextResponse.json({ error: 'Échec du changement d\'email' }, { status: 400 });
      SecurityHeaders.addSecurityHeaders(response);
      return await ensureMinimumResponseTime(Promise.resolve(response), startTime);
    }

    // 6. Log request and respond
    await securityLogger.logSecurityEvent(
      SecurityEventType.EMAIL_CHANGE_REQUEST,
      SecurityEventSeverity.INFO,
      req,
      {
        old_email: user.email?.substring(0, 3) + '***',
        new_email: newEmail.substring(0, 3) + '***',
        user_id: user.id
      }
    );
    const response = NextResponse.json(
      { success: true, message: 'Email de confirmation envoyé au nouvel email' },
      { status: 200 }
    );
    SecurityHeaders.addSecurityHeaders(response);
    return await ensureMinimumResponseTime(Promise.resolve(response), startTime);

  } catch (err) {
    await securityLogger.logSecurityEvent(
      SecurityEventType.EMAIL_CHANGE_FAILED,
      SecurityEventSeverity.ERROR,
      req,
      { message: err instanceof Error ? err.message : 'unknown_error' }
    );
    const response = NextResponse.json(
      { error: 'Une erreur interne est survenue. Veuillez réessayer.' },
      { status: 500 }
    );
    SecurityHeaders.addSecurityHeaders(response);
    return await ensureMinimumResponseTime(Promise.resolve(response), startTime);
  }
}
