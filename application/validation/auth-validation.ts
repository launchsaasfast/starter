// Basic email/password validators
export function validateEmail(email: string) {
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return { isValid, error: isValid ? null : 'Invalid email address' };
}

export function validatePassword(password: string) {
  const minLength = 8;
  const isValid = password.length >= minLength;
  return { isValid, error: isValid ? null : `Password must be at least ${minLength} characters` };
}
