import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import {
  securityLogger,
  SecurityEventType,
  SecurityEventSeverity,
  SecurityHeaders
} from '@/lib/security-logger';

const MIN_RESPONSE_TIME = 150; // ms for reset-password

/**
 * Utility to ensure a minimum response time (mitigate timing attacks)
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
    const body = await req.json();
    const { password, access_token, refresh_token } = body;

    // Validate presence of token and password
    if (!password || !access_token) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.PASSWORD_RESET_REQUEST,
        SecurityEventSeverity.WARNING,
        req,
        { error: 'missing_token_or_password' }
      );
      const response = NextResponse.json({ error: 'Token et mot de passe requis' }, { status: 400 });
      SecurityHeaders.addSecurityHeaders(response);
      return await ensureMinimumResponseTime(Promise.resolve(response), startTime);
    }

    // Validate password policy
    if (password.length < 8) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.PASSWORD_RESET_REQUEST,
        SecurityEventSeverity.WARNING,
        req,
        { error: 'password_too_short', length: password.length }
      );
      const response = NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 });
      SecurityHeaders.addSecurityHeaders(response);
      return await ensureMinimumResponseTime(Promise.resolve(response), startTime);
    }

    // Créer le client Supabase server
    const supabase = await createServerSupabaseClient();

    // Set session with tokens
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });
    if (sessionError) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.PASSWORD_RESET_FAILED,
        SecurityEventSeverity.WARNING,
        req,
        { error: 'invalid_token' }
      );
      const response = NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 400 });
      SecurityHeaders.addSecurityHeaders(response);
      return await ensureMinimumResponseTime(Promise.resolve(response), startTime);
    }

    // Update user password
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.PASSWORD_RESET_FAILED,
        SecurityEventSeverity.ERROR,
        req,
        { error: updateError.message }
      );
      const response = NextResponse.json({ error: 'Échec de mise à jour du mot de passe' }, { status: 400 });
      SecurityHeaders.addSecurityHeaders(response);
      return await ensureMinimumResponseTime(Promise.resolve(response), startTime);
    }

    // Success
    await securityLogger.logSecurityEvent(
      SecurityEventType.PASSWORD_RESET_SUCCESS,
      SecurityEventSeverity.INFO,
      req,
      { user_id: sessionData.user?.id }
    );
    const response = NextResponse.json(
      { success: true, message: 'Mot de passe réinitialisé avec succès' },
      { status: 200 }
    );
    SecurityHeaders.addSecurityHeaders(response);
    return await ensureMinimumResponseTime(Promise.resolve(response), startTime);

  } catch (err) {
    await securityLogger.logSecurityEvent(
      SecurityEventType.PASSWORD_RESET_FAILED,
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
