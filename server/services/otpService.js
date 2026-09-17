import bcrypt from 'bcryptjs';
import Otp from '../models/Otp.js';
import { sendOtpEmail } from './emailService.js';

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

/**
 * Generate 6-digit numeric OTP, store bcrypt hash in DB, and send via email
 */
export async function generateAndSendOtp(email, purpose = 'EMAIL_VERIFICATION', userId = null, recipientName = '') {
  const cleanEmail = email.toString().toLowerCase().trim();

  // Invalidate any existing unused OTPs for this email and purpose
  await Otp.deleteMany({ email: cleanEmail, purpose });

  // Generate 6-digit numeric OTP
  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = bcrypt.genSaltSync(10);
  const otpHash = bcrypt.hashSync(rawOtp, salt);

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Save hashed OTP in database
  await Otp.create({
    userId,
    email: cleanEmail,
    otpHash,
    purpose,
    expiresAt,
    attempts: 0,
    usedAt: null,
  });

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
  const otpDoc = await Otp.findOne({
    email: cleanEmail,
    purpose,
    usedAt: null,
  }).sort({ createdAt: -1 });

  if (!otpDoc) {
    return { valid: false, message: 'No active OTP verification code found. Please request a new OTP.' };
  }

  // Check attempt limit
  if (otpDoc.attempts >= MAX_ATTEMPTS) {
    return { valid: false, message: 'Maximum verification attempts exceeded. Please request a new OTP.' };
  }

  // Check expiration
  if (new Date() > otpDoc.expiresAt) {
    return { valid: false, message: 'OTP code has expired. Please request a new OTP.' };
  }

  // Increment attempts counter
  otpDoc.attempts += 1;
  await otpDoc.save();

  // Compare bcrypt hash
  const isMatch = bcrypt.compareSync(cleanOtp, otpDoc.otpHash);
  if (!isMatch) {
    const remaining = MAX_ATTEMPTS - otpDoc.attempts;
    return {
      valid: false,
      message: `Invalid OTP code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Maximum attempts exceeded.'}`,
    };
  }

  // Mark OTP as single-use verified
  otpDoc.usedAt = new Date();
  await otpDoc.save();

  return { valid: true, message: 'OTP verified successfully' };
}
