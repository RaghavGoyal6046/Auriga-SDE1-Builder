import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Rate Limiter for Login Endpoint (15 attempts per 15 mins)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many login attempts from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter for OTP Requests (5 requests per 10 mins)
export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Too many OTP requests from this IP. Please wait a few minutes before requesting another OTP.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helmet Configuration for Security Headers
export const configureHelmet = () => {
  return helmet({
    contentSecurityPolicy: false, // Disabled for Vite dev server HMR compatibility
    crossOriginEmbedderPolicy: false,
  });
};
