import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { verifyTOTPCode } from '@/utils/auth/totp';
import { verifyBackupCode, cleanBackupCode } from '@/utils/auth/backup-codes';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from '@/lib/security-logger';
import { getRateLimitService, RateLimitTier, rateLimitUtils } from '@/lib/rate-limit';

interface VerifyRequest {
  code: string;
  type: 'totp' | 'backup';
}

/**
 * POST /api/auth/2fa/verify
 * Verify TOTP code or backup code and upgrade session to AAL2
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - strict for verification attempts
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
        { action: '2fa_verify_rate_limited', attemptsRemaining: rateLimitResult.remaining }
      );

      return rateLimitUtils.createTooManyRequestsResponse(
        rateLimitResult,
        'Rate limit exceeded. Too many verification attempts.'
      );
    }

    // Parse request body
    const { code, type = 'totp' }: VerifyRequest = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
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

    let verificationSuccess = false;
    let aal: 'aal1' | 'aal2' = 'aal1';

    if (type === 'totp') {
      // Verify TOTP code
      const { data: mfaFactor } = await supabase
        .from('user_mfa_factors')
        .select('secret, is_active')
        .eq('user_id', user.id)
        .eq('factor_type', 'totp')
        .single();

      if (!mfaFactor?.secret) {
        await securityLogger.logSecurityEvent(
          SecurityEventType.LOGIN_FAILED,
          SecurityEventSeverity.WARNING,
          req,
          { action: '2fa_verify_no_factor', type },
          user.id,
          user.email
        );

        return NextResponse.json(
          { error: 'TOTP not configured for this account' },
          { status: 400 }
        );
      }

      // Verify the TOTP code
      verificationSuccess = verifyTOTPCode(code, mfaFactor.secret);

      if (verificationSuccess) {
        // Activate the MFA factor if this is the first successful verification
        if (!mfaFactor.is_active) {
          await supabase
            .from('user_mfa_factors')
            .update({
              is_active: true,
              verified_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('factor_type', 'totp');
        }

        aal = 'aal2';
      }

    } else if (type === 'backup') {
      // Verify backup code
      const cleanedCode = cleanBackupCode(code);

      // Get unused backup codes for the user
      const { data: backupCodes } = await supabase
        .from('backup_codes')
        .select('id, code_hash, salt, used_at')
        .eq('user_id', user.id)
        .is('used_at', null);

      if (!backupCodes || backupCodes.length === 0) {
        await securityLogger.logSecurityEvent(
          SecurityEventType.LOGIN_FAILED,
          SecurityEventSeverity.WARNING,
          req,
          { action: '2fa_verify_no_backup_codes', type },
          user.id,
          user.email
        );

        return NextResponse.json(
          { error: 'No backup codes available' },
          { status: 400 }
        );
      }

      // Try to verify against each unused backup code
      for (const backupCode of backupCodes) {
        const isValid = await verifyBackupCode(
          cleanedCode,
          backupCode.code_hash,
          backupCode.salt
        );

        if (isValid) {
          // Mark this backup code as used
          await supabase
            .from('backup_codes')
            .update({ used_at: new Date().toISOString() })
            .eq('id', backupCode.id);

          verificationSuccess = true;
          aal = 'aal2';
          break;
        }
      }
    }

    if (!verificationSuccess) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.LOGIN_FAILED,
        SecurityEventSeverity.WARNING,
        req,
        { action: '2fa_verify_failed', type, codeLength: code.length },
        user.id,
        user.email
      );

      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid verification code',
        },
        { status: 400 }
      );
    }

    // Update session AAL level (Authentication Assurance Level)
    // Note: This would typically involve updating the session in Supabase Auth
    // For now, we'll just return the success status

    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGIN_SUCCESS,
      SecurityEventSeverity.INFO,
      req,
      { 
        action: '2fa_verify_success',
        type,
        aal,
        backupCodeUsed: type === 'backup'
      },
      user.id,
      user.email
    );

    // If this was a backup code, check if user needs to regenerate codes
    let shouldRegenerateBackup = false;
    if (type === 'backup') {
      const { data: remainingCodes } = await supabase
        .from('backup_codes')
        .select('id')
        .eq('user_id', user.id)
        .is('used_at', null);

      shouldRegenerateBackup = (remainingCodes?.length || 0) < 3;
    }

    return NextResponse.json({
      success: true,
      message: 'Verification successful',
      aal,
      shouldRegenerateBackup,
    });

  } catch (error) {
    console.error('2FA verification error:', error);

    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGIN_FAILED,
      SecurityEventSeverity.ERROR,
      req,
      {
        action: '2fa_verify_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    return NextResponse.json(
      { error: 'Internal server error during verification' },
      { status: 500 }
    );
  }
}
