// Client API d'authentification - Version simplifiée avec routes existantes
import { mutate } from 'swr';

// Types basiques pour les réponses API
interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: {
    id: string;
    email: string;
    email_confirmed_at?: string;
    last_sign_in_at?: string;
  };
}

interface UserProfile {
  email: string;
  name?: string;
  avatar?: string;
}

// Gestion centralisée des erreurs
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  return data;
}

// Client API simplifié avec uniquement les routes existantes
export const api = {
  // 🔐 Module auth - Authentification de base
  auth: {
    async login(email: string, password: string): Promise<AuthResponse> {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await handleResponse<AuthResponse>(response);
      
      // Invalider le cache utilisateur après connexion réussie
      if (result.success) {
        mutate('/api/user/me');
      }
      
      return result;
    },

    async signup(email: string, password: string): Promise<AuthResponse> {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await handleResponse<AuthResponse>(response);
      
      // Invalider le cache utilisateur après inscription réussie
      if (result.success) {
        mutate('/api/user/me');
      }
      
      return result;
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

    async forgotPassword(email: string) {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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

    // Authentification sociale (GitHub et Google)
    async githubSignIn() {
      const response = await fetch('/api/auth/github', {
        method: 'POST',
      });
      return handleResponse(response);
    },

    async googleSignIn() {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
      });
      return handleResponse(response);
    },
  },

  // 👤 Module user - Gestion du profil utilisateur
  user: {
    async getProfile(): Promise<UserProfile> {
      const response = await fetch('/api/user/me');
      return handleResponse<UserProfile>(response);
    },
  },
};