/**
 * TOTP (Time-based One-Time Password) Service
 * Implementation according to RFC 6238 standards
 */

import { createHmac, randomBytes } from 'crypto';

export interface TOTPSecret {
  secret: string;
  issuer: string;
  label: string;
  qrCodeUrl: string;
}

export interface TOTPOptions {
  window?: number; // Time window tolerance (default: 1)
  step?: number; // Time step in seconds (default: 30)
  digits?: number; // Number of digits in TOTP (default: 6)
  algorithm?: 'sha1' | 'sha256' | 'sha512'; // Hash algorithm (default: sha1)
}

/**
 * Generate a random TOTP secret key
 * @returns Base32-encoded secret string
 */
export function generateTOTPSecret(): string {
  // Generate 32 bytes (256 bits) of entropy as recommended
  const buffer = randomBytes(32);
  return encodeBase32(buffer);
}

/**
 * Generate QR code URL for TOTP setup
 * @param secret - Base32-encoded secret
 * @param issuer - Service name (e.g., "LaunchSaasFast")
 * @param label - User identifier (e.g., email)
 * @returns Complete TOTP secret object with QR code URL
 */
export function generateQRCodeData(
  secret: string,
  issuer: string,
  label: string
): TOTPSecret {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedLabel = encodeURIComponent(label);
  
  // Format according to Google Authenticator specification
  const otpauthUrl = `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  
  return {
    secret,
    issuer,
    label,
    qrCodeUrl: otpauthUrl,
  };
}

/**
 * Verify a TOTP code against a secret
 * @param code - 6-digit TOTP code to verify
 * @param secret - Base32-encoded secret
 * @param options - TOTP configuration options
 * @returns true if code is valid within time window
 */
export function verifyTOTPCode(
  code: string,
  secret: string,
  options: TOTPOptions = {}
): boolean {
  const {
    window = 1,
    step = 30,
    digits = 6,
    algorithm = 'sha1'
  } = options;

  // Validate input
  if (!code || code.length !== digits || !/^\d+$/.test(code)) {
    return false;
  }

  try {
    const secretBuffer = decodeBase32(secret);
    const currentTime = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(currentTime / step);

    // Check code within time window (past and future)
    for (let i = -window; i <= window; i++) {
      const counter = currentCounter + i;
      const expectedCode = generateHOTP(secretBuffer, counter, digits, algorithm);
      
      if (code === expectedCode) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

/**
 * Generate current TOTP code for testing purposes
 * @param secret - Base32-encoded secret
 * @param options - TOTP configuration options
 * @returns Current 6-digit TOTP code
 */
export function getCurrentTOTPCode(
  secret: string,
  options: TOTPOptions = {}
): string {
  const {
    step = 30,
    digits = 6,
    algorithm = 'sha1'
  } = options;

  try {
    const secretBuffer = decodeBase32(secret);
    const currentTime = Math.floor(Date.now() / 1000);
    const counter = Math.floor(currentTime / step);

    return generateHOTP(secretBuffer, counter, digits, algorithm);
  } catch (error) {
    console.error('TOTP generation error:', error);
    throw new Error('Failed to generate TOTP code');
  }
}

/**
 * Generate HOTP code according to RFC 4226
 * @param secret - Raw secret buffer
 * @param counter - Time-based counter
 * @param digits - Number of digits in code
 * @param algorithm - Hash algorithm
 * @returns Generated HOTP code
 */
function generateHOTP(
  secret: Buffer,
  counter: number,
  digits: number,
  algorithm: string
): string {
  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter & 0xffffffff, 4);

  // Generate HMAC
  const hmac = createHmac(algorithm, secret);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0xf;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % Math.pow(10, digits);

  // Pad with leading zeros
  return code.toString().padStart(digits, '0');
}

/**
 * Base32 encoding for TOTP secrets
 * @param buffer - Raw bytes to encode
 * @returns Base32-encoded string
 */
function encodeBase32(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decoding for TOTP secrets
 * @param encoded - Base32-encoded string
 * @returns Decoded buffer
 */
function decodeBase32(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const lookup = Object.fromEntries(
    alphabet.split('').map((char, index) => [char, index])
  );

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of encoded.toUpperCase()) {
    if (!(char in lookup)) {
      throw new Error(`Invalid base32 character: ${char}`);
    }

    value = (value << 5) | lookup[char];
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Get remaining time until next TOTP refresh
 * @param step - Time step in seconds (default: 30)
 * @returns Seconds remaining until next code
 */
export function getTOTPTimeRemaining(step: number = 30): number {
  const currentTime = Math.floor(Date.now() / 1000);
  return step - (currentTime % step);
}
