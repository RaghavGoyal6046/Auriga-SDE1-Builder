import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || 'PharmaCompanion <no-reply@pharmacompanion.com>';

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
}

/**
 * Send OTP Email for Pharmacist Account Verification / Password Setup
 */
export async function sendOtpEmail(toEmail, otpCode, purpose = 'EMAIL_VERIFICATION', recipientName = '') {
  const appName = 'PharmaCompanion FEFO ERP';
  const expirationMinutes = 5;
  const subject = purpose === 'PASSWORD_RESET' 
    ? `🔐 ${appName} - Password Reset Verification Code` 
    : `💊 ${appName} - Pharmacist Account Activation OTP`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; background-color: #070b14; color: #f8fafc; border: 1px solid #10b98133; border-radius: 16px; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #10b981; margin: 0; font-size: 24px; font-weight: 800;">💊 ${appName}</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Clinical FEFO Pharmacy ERP & Role Authorization</p>
      </div>

      <div style="background-color: #0e1526; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #e2e8f0;">Hello ${recipientName || 'Pharmacy Staff Member'},</p>
        <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">
          Your 6-digit verification code to activate your <strong>${appName}</strong> pharmacist account is:
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #34d399; background: #070b14; border: 1px border-emerald-500; padding: 12px 24px; border-radius: 12px; display: inline-block;">
            ${otpCode}
          </span>
        </div>

        <p style="margin: 0; font-size: 12px; color: #fbbf24; text-align: center;">
          ⏱️ This single-use OTP will expire in <strong>${expirationMinutes} minutes</strong>.
        </p>
      </div>

      <div style="border-t: 1px solid #ffffff1a; pt-16; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
        <p style="margin: 0 0 6px 0;">🔒 <strong>Security Warning:</strong> If you did not request this verification code, please disregard this email or report to your Pharmacy Administrator.</p>
        <p style="margin: 0;">© 2026 PharmaCompanion FEFO ERP. All rights reserved.</p>
      </div>
    </div>
  `;

  // Log OTP clearly in server console for testing & fallback when SMTP is not configured
  console.log(`=======================================================`);
  console.log(`📧 [EMAIL-SERVICE] Dispatching OTP to ${toEmail}`);
  console.log(`   Purpose: ${purpose}`);
  console.log(`   🔑 OTP CODE: [ ${otpCode} ] (Expires in ${expirationMinutes} mins)`);
  console.log(`=======================================================`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: toEmail,
        subject,
        html: htmlContent,
      });
      console.log(`✅ [EMAIL-SERVICE] Email sent successfully to ${toEmail}`);
    } catch (err) {
      console.error(`❌ [EMAIL-SERVICE] Failed to send email via SMTP:`, err.message);
    }
  }
}
