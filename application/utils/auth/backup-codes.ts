/**
 * Backup Codes Service
 * Implementation following NIST guidelines for recovery codes
 */

import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export interface BackupCode {
  id: string;
  codeHash: string;
  salt: string;
  usedAt?: Date;
}

export interface BackupCodeGeneration {
  codes: string[];
  hashedCodes: BackupCode[];
}

/**
 * Generate a set of backup codes for 2FA recovery
 * @param count - Number of codes to generate (default: 10)
 * @returns Array of plain text codes and their hashed versions
 */
export async function generateBackupCodes(count: number = 10): Promise<BackupCodeGeneration> {
  const codes: string[] = [];
  const hashedCodes: BackupCode[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code (NIST recommended length)
    const code = generateSecureCode(8);
    codes.push(code);

    // Hash the code for secure storage
    const { hash, salt } = await hashBackupCode(code);
    hashedCodes.push({
      id: randomBytes(16).toString('hex'),
      codeHash: hash,
      salt: salt,
    });
  }

  return {
    codes,
    hashedCodes,
  };
}

/**
 * Hash a backup code using scrypt (secure against timing attacks)
 * @param code - Plain text backup code
 * @returns Object with hash and salt
 */
export async function hashBackupCode(code: string): Promise<{ hash: string; salt: string }> {
  // Generate random salt (32 bytes)
  const salt = randomBytes(32);
  
  // Use scrypt with recommended key length (64 bytes)
  const hash = await scryptAsync(code, salt, 64) as Buffer;

  return {
    hash: hash.toString('hex'),
    salt: salt.toString('hex'),
  };
}

/**
 * Verify a backup code against stored hash
 * @param code - Plain text code to verify
 * @param storedHash - Stored hash from database
 * @param storedSalt - Stored salt from database
 * @returns true if code matches
 */
export async function verifyBackupCode(
  code: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    // Recreate hash with same parameters
    const salt = Buffer.from(storedSalt, 'hex');
    const hash = await scryptAsync(code, salt, 64) as Buffer;

    const storedHashBuffer = Buffer.from(storedHash, 'hex');
    
    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(hash, storedHashBuffer);
  } catch (error) {
    console.error('Backup code verification error:', error);
    return false;
  }
}

/**
 * Generate a cryptographically secure alphanumeric code
 * @param length - Length of the code to generate
 * @returns Secure random code
 */
function generateSecureCode(length: number): string {
  // Use alphanumeric characters (excluding confusing chars like 0, O, I, l)
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomBytesLength = Math.ceil(length * 1.5); // Extra bytes for better distribution
  const randomBytesArray = randomBytes(randomBytesLength);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytesArray[i % randomBytesLength] % charset.length;
    result += charset[randomIndex];
  }
  
  return result;
}

/**
 * Format backup codes for display (grouped for readability)
 * @param codes - Array of backup codes
 * @returns Formatted codes for display
 */
export function formatBackupCodesForDisplay(codes: string[]): string[] {
  return codes.map(code => {
    // Add hyphen in middle for readability (e.g., "ABCD-EFGH")
    if (code.length === 8) {
      return `${code.substring(0, 4)}-${code.substring(4)}`;
    }
    return code;
  });
}

/**
 * Validate backup code format
 * @param code - Code to validate
 * @returns true if code has valid format
 */
export function isValidBackupCodeFormat(code: string): boolean {
  // Remove any formatting (hyphens, spaces)
  const cleanCode = code.replace(/[-\s]/g, '').toUpperCase();
  
  // Check length and character set
  const validPattern = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
  return validPattern.test(cleanCode);
}

/**
 * Clean backup code input (remove formatting)
 * @param code - Raw input code
 * @returns Cleaned code for verification
 */
export function cleanBackupCode(code: string): string {
  return code.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Check if backup codes need regeneration
 * @param codes - Array of backup codes with usage info
 * @returns true if codes should be regenerated
 */
export function shouldRegenerateBackupCodes(codes: BackupCode[]): boolean {
  const unusedCodes = codes.filter(code => !code.usedAt);
  
  // Regenerate if less than 3 codes remaining
  return unusedCodes.length < 3;
}

/**
 * Get backup code usage statistics
 * @param codes - Array of backup codes
 * @returns Usage statistics
 */
export function getBackupCodeStats(codes: BackupCode[]) {
  const total = codes.length;
  const used = codes.filter(code => code.usedAt).length;
  const remaining = total - used;
  
  return {
    total,
    used,
    remaining,
    usagePercentage: Math.round((used / total) * 100),
  };
}
