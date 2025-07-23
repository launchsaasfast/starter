import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { generateTOTPSecret, generateQRCodeData } from '@/utils/auth/totp';
import { generateBackupCodes } from '@/utils/auth/backup-codes';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from '@/lib/security-logger';
import { getRateLimitService, RateLimitTier, rateLimitUtils } from '@/lib/rate-limit';

/**
 * POST /api/auth/2fa/setup
 * Setup TOTP 2FA for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - 5 setup attempts per hour per IP
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
        { attemptsRemaining: rateLimitResult.remaining }
      );

      return rateLimitUtils.createTooManyRequestsResponse(
        rateLimitResult,
        'Rate limit exceeded. Too many setup attempts.'
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

    // Check if user already has TOTP enabled
    const { data: existingFactor } = await supabase
      .from('user_mfa_factors')
      .select('id, verified_at')
      .eq('user_id', user.id)
      .eq('factor_type', 'totp')
      .eq('is_active', true)
      .single();

    if (existingFactor && existingFactor.verified_at) {
      return NextResponse.json(
        { error: 'TOTP is already enabled for this account' },
        { status: 400 }
      );
    }

    // Generate TOTP secret
    const secret = generateTOTPSecret();
    const issuer = process.env.NEXT_PUBLIC_APP_NAME || 'LaunchSaasFast';
    const label = user.email || user.id;

    const qrData = generateQRCodeData(secret, issuer, label);

    // Generate backup codes
    const { codes: backupCodes, hashedCodes } = await generateBackupCodes();

    // Start transaction - save MFA factor and backup codes
    const { error: mfaError } = await supabase
      .from('user_mfa_factors')
      .upsert({
        user_id: user.id,
        factor_type: 'totp',
        secret: secret,
        is_active: false, // Will be activated after verification
        backup_codes_generated: true,
      }, {
        onConflict: 'user_id,factor_type'
      });

    if (mfaError) {
      throw new Error(`Failed to save MFA factor: ${mfaError.message}`);
    }

    // Save backup codes
    const backupCodeRecords = hashedCodes.map(hashedCode => ({
      user_id: user.id,
      code_hash: hashedCode.codeHash,
      salt: hashedCode.salt,
    }));

    // Delete any existing backup codes first
    await supabase
      .from('backup_codes')
      .delete()
      .eq('user_id', user.id);

    const { error: backupError } = await supabase
      .from('backup_codes')
      .insert(backupCodeRecords);

    if (backupError) {
      // Cleanup MFA factor if backup codes fail
      await supabase
        .from('user_mfa_factors')
        .delete()
        .eq('user_id', user.id)
        .eq('factor_type', 'totp');

      throw new Error(`Failed to save backup codes: ${backupError.message}`);
    }

    // Log security event
    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGIN_SUCCESS, // Using existing event type for now
      SecurityEventSeverity.INFO,
      req,
      {
        action: '2fa_setup_initiated',
        factorType: 'totp',
        backupCodesGenerated: backupCodes.length,
      },
      user.id,
      user.email
    );

    return NextResponse.json({
      secret: qrData.secret,
      qrCodeUrl: qrData.qrCodeUrl,
      backupCodes: backupCodes,
      message: 'TOTP setup initiated. Please verify with your authenticator app.',
    });

  } catch (error) {
    console.error('2FA setup error:', error);

    // Log error event
    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGIN_FAILED, // Using existing event type for errors
      SecurityEventSeverity.ERROR,
      req,
      {
        action: '2fa_setup_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    return NextResponse.json(
      { error: 'Internal server error during 2FA setup' },
      { status: 500 }
    );
  }
}
