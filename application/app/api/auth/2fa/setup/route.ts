import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseClient';
import { generateTOTPSecret, generateQRCodeData } from '@/utils/auth/totp';
import { generateBackupCodes } from '@/utils/auth/backup-codes';
import { logSecurityEvent } from '@/lib/security-logger';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/auth/2fa/setup
 * Setup TOTP 2FA for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - 5 setup attempts per hour per IP
    const rateLimitResult = await rateLimit(req, {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5,
      keyGenerator: (req) => `2fa_setup_${req.ip}`,
    });

    if (!rateLimitResult.success) {
      await logSecurityEvent({
        eventType: '2FA_SETUP_RATE_LIMITED',
        severity: 'WARNING',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        details: { attemptsRemaining: rateLimitResult.remaining },
      });

      return NextResponse.json(
        { error: 'Rate limit exceeded. Too many setup attempts.' },
        { status: 429 }
      );
    }

    // Get authenticated user
    const supabase = createClient();
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
    await logSecurityEvent({
      eventType: '2FA_SETUP_INITIATED',
      severity: 'INFO',
      userId: user.id,
      email: user.email,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      details: {
        factorType: 'totp',
        backupCodesGenerated: backupCodes.length,
      },
    });

    return NextResponse.json({
      secret: qrData.secret,
      qrCodeUrl: qrData.qrCodeUrl,
      backupCodes: backupCodes,
      message: 'TOTP setup initiated. Please verify with your authenticator app.',
    });

  } catch (error) {
    console.error('2FA setup error:', error);

    // Log error event
    await logSecurityEvent({
      eventType: '2FA_SETUP_ERROR',
      severity: 'ERROR',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      { error: 'Internal server error during 2FA setup' },
      { status: 500 }
    );
  }
}
