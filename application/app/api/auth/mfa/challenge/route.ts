import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseClient';
import { securityLogger, SecurityEventType, SecurityEventSeverity } from '@/lib/security-logger';

/**
 * POST /api/auth/mfa/challenge
 * Initiate an MFA challenge for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé - connexion requise' },
        { status: 401 }
      );
    }

    // Get user's active MFA factors
    const { data: factors } = await supabase.auth.mfa.listFactors();
    
    if (!factors || !factors.totp || factors.totp.length === 0) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.LOGIN_FAILED,
        SecurityEventSeverity.WARNING,
        req,
        { action: 'mfa_challenge_no_factors' },
        user.id,
        user.email
      );

      return NextResponse.json(
        { error: '2FA non configuré pour ce compte' },
        { status: 400 }
      );
    }

    // Get the first (and usually only) TOTP factor
    const totpFactor = factors.totp[0];

    // Create MFA challenge
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totpFactor.id
    });

    if (challengeError) {
      await securityLogger.logSecurityEvent(
        SecurityEventType.LOGIN_FAILED,
        SecurityEventSeverity.ERROR,
        req,
        { 
          action: 'mfa_challenge_failed', 
          error: challengeError.message,
          factorId: totpFactor.id
        },
        user.id,
        user.email
      );

      return NextResponse.json(
        { error: 'Impossible d\'initier le challenge 2FA' },
        { status: 500 }
      );
    }

    // Log successful challenge creation
    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGIN_SUCCESS,
      SecurityEventSeverity.INFO,
      req,
      { 
        action: 'mfa_challenge_created',
        challengeId: challenge.id,
        factorId: totpFactor.id
      },
      user.id,
      user.email
    );

    return NextResponse.json({
      success: true,
      challengeId: challenge.id,
      factorId: totpFactor.id,
      message: 'Challenge MFA créé avec succès'
    });

  } catch (error) {
    console.error('MFA challenge error:', error);

    await securityLogger.logSecurityEvent(
      SecurityEventType.LOGIN_FAILED,
      SecurityEventSeverity.ERROR,
      req,
      {
        action: 'mfa_challenge_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    return NextResponse.json(
      { error: 'Erreur interne lors de la création du challenge 2FA' },
      { status: 500 }
    );
  }
}
