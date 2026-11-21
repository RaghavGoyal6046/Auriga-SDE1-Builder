import bcrypt from 'bcryptjs';
import { execute, queryOne } from '../db/database.js';
import { sendOtpEmail } from './emailService.js';

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

/**
 * Format a JavaScript Date object into MySQL/SQL DATETIME string "YYYY-MM-DD HH:MM:SS"
 */
function toSqlDatetime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Generate 6-digit numeric OTP, store bcrypt hash in DB, and send via email
 */
export async function generateAndSendOtp(email, purpose = 'EMAIL_VERIFICATION', userId = null, recipientName = '') {
  const cleanEmail = email.toString().toLowerCase().trim();

  // Invalidate any existing unused OTPs for this email and purpose
  await execute('DELETE FROM otps WHERE LOWER(email) = ? AND purpose = ?', [cleanEmail, purpose]);

  // Generate 6-digit numeric OTP
  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = bcrypt.genSaltSync(10);
  const otpHash = bcrypt.hashSync(rawOtp, salt);

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const expiresAtStr = toSqlDatetime(expiresAt);

  // Save hashed OTP in database
  await execute(
    `INSERT INTO otps (user_id, email, otp_hash, purpose, expires_at, attempts)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [userId, cleanEmail, otpHash, purpose, expiresAtStr]
  );

  // Dispatch email
  await sendOtpEmail(cleanEmail, rawOtp, purpose, recipientName);

  return { rawOtp, expiresAt };
}

/**
 * Verify 6-digit OTP code against bcrypt hash
 */
export async function verifyOtpCode(email, candidateOtp, purpose = 'EMAIL_VERIFICATION') {
  const cleanEmail = email.toString().toLowerCase().trim();
  const cleanOtp = candidateOtp.toString().trim();

  // Find latest active unused OTP
  const otpDoc = await queryOne(
    `SELECT * FROM otps 
     WHERE LOWER(email) = ? AND purpose = ? AND used_at IS NULL 
     ORDER BY created_at DESC LIMIT 1`,
    [cleanEmail, purpose]
  );

  if (!otpDoc) {
    return { valid: false, message: 'No active OTP verification code found. Please request a new OTP.' };
  }

  // Check attempt limit
  if (otpDoc.attempts >= MAX_ATTEMPTS) {
    return { valid: false, message: 'Maximum verification attempts exceeded. Please request a new OTP.' };
  }

  // Check expiration
  if (new Date() > new Date(otpDoc.expires_at)) {
    return { valid: false, message: 'OTP code has expired. Please request a new OTP.' };
  }

  // Increment attempts counter
  await execute('UPDATE otps SET attempts = attempts + 1 WHERE id = ?', [otpDoc.id]);

  // Compare bcrypt hash
  const isMatch = bcrypt.compareSync(cleanOtp, otpDoc.otp_hash);
  if (!isMatch) {
    const remaining = MAX_ATTEMPTS - (otpDoc.attempts + 1);
    return {
      valid: false,
      message: `Invalid OTP code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Maximum attempts exceeded.'}`,
    };
  }

  // Mark OTP as single-use verified
  const nowStr = toSqlDatetime(new Date());
  await execute('UPDATE otps SET used_at = ? WHERE id = ?', [nowStr, otpDoc.id]);

  return { valid: true, message: 'OTP verified successfully' };
}
