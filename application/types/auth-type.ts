export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthSignupRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthLoginResponse {
  success: boolean;
  requiresTwoFactor?: boolean;
  availableMethods?: Array<{ type: string; factorId: string }>;
  redirectTo?: string;
}

export interface CheckEmailResponse {
  exists: boolean;
}

export interface OAuthResponse {
  url: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface DeviceSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}
