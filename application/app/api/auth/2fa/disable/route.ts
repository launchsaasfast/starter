import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from '@/lib/security-logger';
import { getRateLimitService, RateLimitTier, rateLimitUtils } from '@/lib/rate-limit';

interface DisableRequest {
  password: string;
  confirmationCode?: string; // Optional TOTP code for additional security
}

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA for the authenticated user (requires password confirmation)
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - strict for disable attempts
    const rateLimitService = getRateLimitService();
    const ip = rateLimitUtils.extractIP(req);
    const rateLimitResult = await rateLimitService.checkLimit(
      RateLimitTier.AUTH_OPERATIONS,
      ip
    );

    if (!rateLimitResult.success) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        SecurityEventSeverity.WARNING,
        req,
        { action: '2fa_disable_rate_limited', attemptsRemaining: rateLimitResult.remaining }
      );

      return rateLimitUtils.createTooManyRequestsResponse(
        rateLimitResult,
        'Rate limit exceeded. Too many disable attempts.'
      );
    }

    // Parse request body
    const { password, confirmationCode }: DisableRequest = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to disable 2FA' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify password by attempting to sign in
    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (passwordError) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.LOGIN_FAILED,
        SecurityEventSeverity.WARNING,
        req,
        { 
          action: '2fa_disable_invalid_password',
          email: user.email 
        },
        user.id,
        user.email
      );

      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Optional: Verify TOTP code if provided for extra security
    if (confirmationCode) {
      const { data: mfaFactor } = await supabase
        .from('user_mfa_factors')
        .select('secret')
        .eq('user_id', user.id)
        .eq('factor_type', 'totp')
        .eq('is_active', true)
        .single();

      if (mfaFactor?.secret) {
        const { verifyTOTPCode } = await import('@/utils/auth/totp');
        const isValidCode = verifyTOTPCode(confirmationCode, mfaFactor.secret);
        
        if (!isValidCode) {
          await securityLogger.logSecurityEvent(
            SecurityEventType.LOGIN_FAILED,
            SecurityEventSeverity.WARNING,
            req,
            { 
              action: '2fa_disable_invalid_totp',
              email: user.email 
            },
            user.id,
            user.email
          );

          return NextResponse.json(
            { error: 'Invalid TOTP code' },
            { status: 401 }
          );
        }
      }
    }

    // Check if user has 2FA enabled
    const { data: mfaFactors } = await supabase
      .from('user_mfa_factors')
      .select('id, factor_type')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!mfaFactors || mfaFactors.length === 0) {
      return NextResponse.json(
        { error: '2FA is not enabled for this account' },
        { status: 400 }
      );
    }

    // Begin transaction to disable all MFA factors and delete backup codes
    const { error: disableError } = await supabase
      .from('user_mfa_factors')
      .update({ 
        is_active: false,
        verified_at: null,
      })
      .eq('user_id', user.id);

    if (disableError) {
      throw new Error(`Failed to disable MFA factors: ${disableError.message}`);
    }

    // Delete all backup codes
    const { error: backupError } = await supabase
      .from('backup_codes')
      .delete()
      .eq('user_id', user.id);

    if (backupError) {
      console.error('Failed to delete backup codes:', backupError);
      // Don't fail the request if backup codes can't be deleted
    }

    // Update device sessions to downgrade AAL
    const { error: sessionError } = await supabase
      .from('device_sessions')
      .update({ 
        aal: 'aal1',
        needs_verification: false,
      })
      .eq('user_id', user.id);

    if (sessionError) {
      console.error('Failed to update device sessions:', sessionError);
      // Don't fail the request if session update fails
    }

    // Log successful 2FA disable
    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGIN_SUCCESS,
      SecurityEventSeverity.INFO,
      req,
      { 
        action: '2fa_disabled',
        factorTypes: mfaFactors.map(f => f.factor_type),
        confirmationMethod: confirmationCode ? 'password_and_totp' : 'password_only'
      },
      user.id,
      user.email
    );

    return NextResponse.json({
      success: true,
      message: '2FA has been successfully disabled',
      factorsDisabled: mfaFactors.length,
    });

  } catch (error) {
    console.error('2FA disable error:', error);

    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGIN_FAILED,
      SecurityEventSeverity.ERROR,
      req,
      {
        action: '2fa_disable_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    return NextResponse.json(
      { error: 'Internal server error during 2FA disable' },
      { status: 500 }
    );
  }
}
