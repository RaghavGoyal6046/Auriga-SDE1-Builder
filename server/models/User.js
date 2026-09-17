import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: function () {
        // Password hash required unless signed up exclusively via Google OAuth
        return !this.googleId;
      },
      select: false,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'PHARMACIST'],
      default: 'PHARMACIST',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      default: null,
      sparse: true,
    },
    phone: {
      type: String,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password against bcrypt hash
userSchema.methods.comparePassword = function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compareSync(candidatePassword.toString(), this.passwordHash);
};

// Remove passwordHash from JSON responses automatically
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
