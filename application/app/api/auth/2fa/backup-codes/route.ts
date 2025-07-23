import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { generateBackupCodes } from '@/utils/auth/backup-codes';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from '@/lib/security-logger';
import { getRateLimitService, RateLimitTier, rateLimitUtils } from '@/lib/rate-limit';

/**
 * POST /api/auth/2fa/backup-codes
 * Generate new backup codes for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - 3 regenerations per day per user
    const rateLimitService = getRateLimitService();
    const ip = rateLimitUtils.extractIP(req);
    const rateLimitResult = await rateLimitService.checkLimit(
      RateLimitTier.DATA_EXPORTS, // Using this tier for limited daily operations
      ip
    );

    if (!rateLimitResult.success) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        SecurityEventSeverity.WARNING,
        req,
        { action: 'backup_codes_regenerate_rate_limited', attemptsRemaining: rateLimitResult.remaining }
      );

      return rateLimitUtils.createTooManyRequestsResponse(
        rateLimitResult,
        'Rate limit exceeded. Too many backup code regeneration attempts.'
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

    // Check if user has 2FA enabled
    const { data: mfaFactor } = await supabase
      .from('user_mfa_factors')
      .select('id, is_active, verified_at')
      .eq('user_id', user.id)
      .eq('factor_type', 'totp')
      .eq('is_active', true)
      .single();

    if (!mfaFactor || !mfaFactor.verified_at) {
      return NextResponse.json(
        { error: '2FA must be enabled and verified before generating backup codes' },
        { status: 400 }
      );
    }

    // Generate new backup codes
    const { codes: backupCodes, hashedCodes } = await generateBackupCodes();

    // Delete all existing backup codes
    const { error: deleteError } = await supabase
      .from('backup_codes')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      throw new Error(`Failed to delete existing backup codes: ${deleteError.message}`);
    }

    // Insert new backup codes
    const backupCodeRecords = hashedCodes.map(hashedCode => ({
      user_id: user.id,
      code_hash: hashedCode.codeHash,
      salt: hashedCode.salt,
    }));

    const { error: insertError } = await supabase
      .from('backup_codes')
      .insert(backupCodeRecords);

    if (insertError) {
      throw new Error(`Failed to save new backup codes: ${insertError.message}`);
    }

    // Update MFA factor to reflect backup codes regeneration
    await supabase
      .from('user_mfa_factors')
      .update({ 
        backup_codes_generated: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('factor_type', 'totp');

    // Log security event
    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGIN_SUCCESS, // Using existing event type
      SecurityEventSeverity.INFO,
      req,
      { 
        action: 'backup_codes_regenerated',
        newCodesCount: backupCodes.length,
      },
      user.id,
      user.email
    );

    return NextResponse.json({
      backupCodes: backupCodes,
      message: 'New backup codes generated successfully',
      count: backupCodes.length,
    });

  } catch (error) {
    console.error('Backup codes regeneration error:', error);

    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGIN_FAILED,
      SecurityEventSeverity.ERROR,
      req,
      {
        action: 'backup_codes_regenerate_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    return NextResponse.json(
      { error: 'Internal server error during backup codes regeneration' },
      { status: 500 }
    );
  }
}
