// Centralisation de la configuration d'authentification (OAuth, politique de mot de passe, vérification)
export const authConfig = {
  socialProviders: {
    google: {
      enabled: true, // Activé selon documentation
      scope: 'email profile'
    },
    github: {
      enabled: true,
      scope: 'user:email'
    }
  },
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: false
  },
  verification: {
    emailRequired: true,
    codeLength: 6,
    expirationMinutes: 15
  }
};

export type AuthConfig = typeof authConfig;
