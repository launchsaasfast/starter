/**
 * Centralized API client for authentication and security operations
 * Provides typed interfaces for all authentication-related API calls
 */

export interface TOTPSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  aal?: 'aal1' | 'aal2';
}

export interface MFAStatus {
  enabled: boolean;
  factors: Array<{
    type: 'totp' | 'sms' | 'email';
    verified: boolean;
  }>;
  hasBackupCodes: boolean;
}

export interface MFAChallengeResponse {
  success: boolean;
  challengeId: string;
  factorId: string;
  message: string;
}

/**
 * API client for 2FA operations
 */
export const auth2FAApi = {
  /**
   * Setup TOTP 2FA for the current user
   */
  async setup(): Promise<TOTPSetupResponse> {
    const response = await fetch('/api/auth/2fa/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to setup 2FA');
    }
    
    return response.json();
  },

  /**
   * Verify TOTP code or backup code
   */
  async verify(code: string, type: 'totp' | 'backup' = 'totp'): Promise<VerificationResponse> {
    const response = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, type }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Verification failed');
    }
    
    return response.json();
  },

  /**
   * Disable 2FA for the current user
   */
  async disable(password: string): Promise<VerificationResponse> {
    const response = await fetch('/api/auth/2fa/disable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to disable 2FA');
    }
    
    return response.json();
  },

  /**
   * Get current MFA status
   */
  async getStatus(): Promise<MFAStatus> {
    const response = await fetch('/api/auth/2fa/status');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get MFA status');
    }
    
    return response.json();
  },

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(): Promise<{ backupCodes: string[] }> {
    const response = await fetch('/api/auth/2fa/backup-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to regenerate backup codes');
    }
    
    return response.json();
  },
};

/**
 * Device management API
 */
export const deviceApi = {
  /**
   * Get all user devices
   */
  async getDevices() {
    const response = await fetch('/api/user/devices');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get devices');
    }
    
    return response.json();
  },

  /**
   * Revoke a specific device
   */
  async revokeDevice(deviceId: string) {
    const response = await fetch(`/api/user/devices/${deviceId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to revoke device');
    }
    
    return response.json();
  },

  /**
   * Trust a device
   */
  async trustDevice(deviceId: string) {
    const response = await fetch(`/api/user/devices/${deviceId}/trust`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to trust device');
    }
    
    return response.json();
  },
};
