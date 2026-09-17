import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['EMAIL_VERIFICATION', 'PASSWORD_RESET'],
      default: 'EMAIL_VERIFICATION',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '24h' }, // Automatic MongoDB TTL cleanup
    },
    attempts: {
      type: Number,
      default: 0,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify candidate 6-digit OTP against bcrypt hash
otpSchema.methods.compareOtp = function (candidateOtp) {
  if (!this.otpHash) return false;
  return bcrypt.compareSync(candidateOtp.toString().trim(), this.otpHash);
};

const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema);

export default Otp;
