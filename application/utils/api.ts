// Client API d'authentification - Explication complète
import { mutate } from 'swr';
import {
    AuthLoginRequest,
    AuthLoginResponse,
    AuthSignupRequest,
    CheckEmailResponse,
    OAuthResponse,
    DeviceSession,
    UserProfile
} from "@/types/auth-type"


// Gestion centralisée des erreurs
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  return data;
}

// Client API complet
export const api = {
  // 🔐 Module auth - Authentification complète
  auth: {
    // Authentification de base
    async verify(code: string, type: string = 'email') {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, type }),
      });
      return handleResponse(response);
    },

    async login(data: AuthLoginRequest): Promise<AuthLoginResponse> {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await handleResponse<AuthLoginResponse>(response);
      
      // Invalider le cache utilisateur après connexion réussie
      if (result.success && !result.requiresTwoFactor) {
        mutate('/api/user/me');
      }
      
      return result;
    },

    async signup(data: AuthSignupRequest) {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    async logout() {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      const result = await handleResponse(response);
      
      // Invalider tous les caches après déconnexion
      mutate(() => true, undefined, { revalidate: false });
      
      return result;
    },

    async checkEmail(email: string): Promise<CheckEmailResponse> {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return handleResponse<CheckEmailResponse>(response);
    },

    // Authentification sociale
    async googleSignIn(): Promise<OAuthResponse> {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
      });
      return handleResponse<OAuthResponse>(response);
    },

    async githubSignIn(): Promise<OAuthResponse> {
      const response = await fetch('/api/auth/github', {
        method: 'POST',
      });
      return handleResponse<OAuthResponse>(response);
    },

    async connectSocialProvider(provider: 'google' | 'github') {
      const response = await fetch(`/api/auth/connect/${provider}`, {
        method: 'POST',
      });
      const result = await handleResponse(response);
      mutate('/api/user/me'); // Rafraîchir le profil utilisateur
      return result;
    },

    async disconnectSocialProvider(provider: 'google' | 'github') {
      const response = await fetch(`/api/auth/disconnect/${provider}`, {
        method: 'DELETE',
      });
      const result = await handleResponse(response);
      mutate('/api/user/me'); // Rafraîchir le profil utilisateur
      return result;
    },

    // Authentification à deux facteurs (2FA)
    async setup2FA() {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });
      return handleResponse(response);
    },

    async disable2FA(code: string) {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const result = await handleResponse(response);
      mutate('/api/user/me'); // Rafraîchir le profil utilisateur
      return result;
    },

    // Gestion des mots de passe
    async changePassword(currentPassword: string, newPassword: string) {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return handleResponse(response);
    },

    async resetPassword(token: string, newPassword: string) {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      return handleResponse(response);
    },

    async forgotPassword(email: string) {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return handleResponse(response);
    },

    // Gestion des emails
    async resendConfirmation(email: string) {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return handleResponse(response);
    },

    async sendEmailAlert(type: string, message: string) {
      const response = await fetch('/api/auth/email-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message }),
      });
      return handleResponse(response);
    },

    async sendEmailVerification() {
      const response = await fetch('/api/auth/send-email-verification', {
        method: 'POST',
      });
      return handleResponse(response);
    },

    async changeEmail(newEmail: string, password: string) {
      const response = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail, password }),
      });
      const result = await handleResponse(response);
      mutate('/api/user/me'); // Rafraîchir le profil utilisateur
      return result;
    },

    // Vérification d'appareils
    verifyDevice: {
      async sendCode(deviceId: string) {
        const response = await fetch('/api/auth/verify-device/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        });
        return handleResponse(response);
      },

      async verify(deviceId: string, code: string) {
        const response = await fetch('/api/auth/verify-device/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId, code }),
        });
        return handleResponse(response);
      },
    },

    // Gestion des sessions d'appareils
    device: {
      async getSessions(): Promise<DeviceSession[]> {
        const response = await fetch('/api/auth/device/sessions');
        return handleResponse<DeviceSession[]>(response);
      },

      async revokeSession(sessionId: string) {
        const response = await fetch(`/api/auth/device/sessions/${sessionId}`, {
          method: 'DELETE',
        });
        const result = await handleResponse(response);
        mutate('/api/auth/device/sessions'); // Rafraîchir la liste des sessions
        return result;
      },

      async revokeAllSessions() {
        const response = await fetch('/api/auth/device/sessions', {
          method: 'DELETE',
        });
        const result = await handleResponse(response);
        mutate('/api/auth/device/sessions'); // Rafraîchir la liste des sessions
        return result;
      },
    },
  },

  // 👤 Module user - Gestion du profil utilisateur
  user: {
    async getProfile(): Promise<UserProfile> {
      const response = await fetch('/api/user/me');
      return handleResponse<UserProfile>(response);
    },

    async updateProfile(data: Partial<UserProfile>) {
      const response = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await handleResponse<UserProfile>(response);
      mutate('/api/user/me', result); // Mettre à jour le cache
      return result;
    },

    async deleteAccount(password: string) {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await handleResponse(response);
      
      // Invalider tous les caches après suppression du compte
      mutate(() => true, undefined, { revalidate: false });
      
      return result;
    },

    async uploadAvatar(file: File) {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });
      const result = await handleResponse(response);
      mutate('/api/user/me'); // Rafraîchir le profil utilisateur
      return result;
    },
  },
};