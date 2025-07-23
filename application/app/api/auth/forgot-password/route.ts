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
 * Utility to ensure a minimum response time to mitigate timing attacks
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
  let email = '';
  try {
    // Créer le client Supabase avec SSR
    const supabase = await createServerSupabaseClient();
    
    const body = await req.json();
    if (!body.email) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.PASSWORD_RESET_REQUEST,
        SecurityEventSeverity.WARNING,
        req,
        { error: 'missing_email' }
      );
      const response = NextResponse.json({ error: 'Email requis' }, { status: 400 });
      SecurityHeaders.addSecurityHeaders(response);
      return await ensureMinimumResponseTime(Promise.resolve(response), startTime);
    }
    email = body.email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.PASSWORD_RESET_REQUEST,
        SecurityEventSeverity.WARNING,
        req,
        { error: 'invalid_email', email: email.substring(0, 3) + '***' }
      );
      const response = NextResponse.json({ error: 'Format d\'email invalide.' }, { status: 400 });
      SecurityHeaders.addSecurityHeaders(response);
      return await ensureMinimumResponseTime(Promise.resolve(response), startTime);
    }

    await securityLogger.logSecurityEvent(
      SecurityEventType.PASSWORD_RESET_REQUEST,
      SecurityEventSeverity.INFO,
      req,
      { email: email.substring(0, 3) + '***' }
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: AUTH_CONFIG.supabase.redirectTo.passwordRecovery
    });

    await securityLogger.logSecurityEvent(
      SecurityEventType.PASSWORD_RESET_SUCCESS,
      SecurityEventSeverity.INFO,
      req,
      { email: email.substring(0, 3) + '***' }
    );

    const response = NextResponse.json(
      { success: true, message: 'Email de réinitialisation envoyé si le compte existe' },
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
      { error: 'Une erreur est survenue. Veuillez réessayer.' },
      { status: 500 }
    );
    SecurityHeaders.addSecurityHeaders(response);
    return await ensureMinimumResponseTime(Promise.resolve(response), startTime);
  }
}
