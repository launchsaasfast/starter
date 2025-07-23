import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';

/**
 * GET /api/auth/2fa/status
 * Get current MFA status for the authenticated user
 */
export async function GET() {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get MFA factors
    const { data: mfaFactors } = await supabase
      .from('user_mfa_factors')
      .select('factor_type, is_active, verified_at, backup_codes_generated')
      .eq('user_id', user.id);

    // Get backup codes count
    const { data: backupCodes } = await supabase
      .from('backup_codes')
      .select('id, used_at')
      .eq('user_id', user.id);

    const activeFactor = mfaFactors?.find(f => f.is_active && f.verified_at);
    const hasActiveBackupCodes = backupCodes && backupCodes.some(code => !code.used_at);
    const remainingBackupCodes = backupCodes ? backupCodes.filter(code => !code.used_at).length : 0;

    return NextResponse.json({
      enabled: !!activeFactor,
      factors: mfaFactors?.map(factor => ({
        type: factor.factor_type,
        verified: !!factor.verified_at,
        active: factor.is_active,
      })) || [],
      hasBackupCodes: hasActiveBackupCodes,
      remainingBackupCodes,
      needsSetup: !activeFactor,
      lastVerified: activeFactor?.verified_at || null,
    });

  } catch (error) {
    console.error('2FA status error:', error);

    return NextResponse.json(
      { error: 'Internal server error getting 2FA status' },
      { status: 500 }
    );
  }
}
