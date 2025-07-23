export const AUTH_CONFIG = {
  socialProviders: {
    google: {
      enabled: true
    },
    github: {
      enabled: true
    }
  },
  redirectUrls: {
    // URLs de redirection pour les différents types de vérification
    signup: '/auth/verify',
    emailChange: '/auth/verify', 
    passwordRecovery: '/auth/reset-password',
    magicLink: '/auth/verify',
    base: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  },
  supabase: {
    // Configuration pour les redirections Supabase
    redirectTo: {
      signup: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/verify?type=signup`,
      emailChange: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/verify?type=email_change`,
      passwordRecovery: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password?type=recovery`,
    }
  }
};
