import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Pill, ArrowRight, ShieldCheck, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password / OTP Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email Input, 2: Enter OTP, 3: New Password
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [dispatchedOtp, setDispatchedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStatus, setResetStatus] = useState({ error: '', success: '', loading: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Request 6-digit OTP via Email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setResetStatus({ error: '', success: '', loading: true });

    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetIdentifier, identifier: resetIdentifier })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP code');

      setDispatchedOtp(data.otp);
      setResetStatus({
        error: '',
        success: `${data.message}. Verification OTP: [ ${data.otp} ]`,
        loading: false
      });
      setResetStep(2);
    } catch (err) {
      setResetStatus({ error: err.message, success: '', loading: false });
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setResetStatus({ error: '', success: '', loading: true });

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetIdentifier, identifier: resetIdentifier, otp: enteredOtp })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP verification failed');

      setResetStatus({ error: '', success: 'OTP verified! Set your new password.', loading: false });
      setResetStep(3);
    } catch (err) {
      setResetStatus({ error: err.message, success: '', loading: false });
    }
  };

  // Step 3: Complete Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setResetStatus({ error: 'Passwords do not match', success: '', loading: false });
      return;
    }

    setResetStatus({ error: '', success: '', loading: true });

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetIdentifier,
          identifier: resetIdentifier,
          otp: enteredOtp,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setResetStatus({ error: '', success: data.message, loading: false });
      setEmail(resetIdentifier);
      setTimeout(() => {
        setShowResetModal(false);
        setResetStep(1);
      }, 2000);
    } catch (err) {
      setResetStatus({ error: err.message, success: '', loading: false });
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full glass-panel p-8 relative border-emerald-500/20">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-emerald-500/30">
            <Pill className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Sign In to Pharma<span className="text-emerald-400">Companion</span></h2>
          <p className="text-xs text-emerald-400/80 font-medium mt-1">Clinical FEFO Pharmacy ERP & Authorization</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label text-xs">Email Address (Login ID)</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 absolute left-3.5 pointer-events-none text-gray-400 z-10" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@pharma.com"
                className="form-input has-icon text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label text-xs mb-0">Password</label>
              <button
                type="button"
                onClick={() => {
                  setResetIdentifier(email || '');
                  setShowResetModal(true);
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 absolute left-3.5 pointer-events-none text-gray-400 z-10" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input has-icon text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary justify-center py-2.5 mt-2 text-sm font-semibold"
          >
            {loading ? 'Authenticating...' : 'Sign In to FEFO Workbench'} <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          First-time setup?{' '}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-bold">
            Initial Admin Registration
          </Link>
        </p>

      </div>

      {/* Password Recovery & Email OTP Verification Modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Password Recovery & Email Verification</h3>
              </div>
              <button onClick={() => setShowResetModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {resetStatus.error && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetStatus.error}</span>
              </div>
            )}

            {resetStatus.success && (
              <div className="mb-4 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resetStatus.success}</span>
              </div>
            )}

            {/* Step 1: Enter Registered Email Address */}
            {resetStep === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4 text-xs">
                <div>
                  <label className="form-label text-[11px]">Registered Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@pharma.com"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    className="form-input text-xs py-2"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    A 6-digit security OTP code will be sent to your registered email address.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowResetModal(false)} className="btn-secondary text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={resetStatus.loading} className="btn-primary text-xs py-2">
                    {resetStatus.loading ? 'Sending OTP...' : 'Send 6-Digit Email OTP'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Enter & Verify 6-digit OTP */}
            {resetStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                  <p className="text-[11px] text-emerald-300 font-semibold">
                    🔑 Security OTP Dispatched!
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Your 6-digit verification OTP code is: <code className="text-emerald-400 font-mono font-bold text-sm">{dispatchedOtp}</code>
                  </p>
                </div>

                <div>
                  <label className="form-label text-[11px]">Enter 6-Digit Verification OTP Code *</label>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    placeholder="e.g. 849201"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    className="form-input text-center text-base tracking-widest font-mono py-2"
                  />
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button type="button" onClick={() => setResetStep(1)} className="text-gray-400 text-[11px] hover:underline">
                    ← Change Email / Resend
                  </button>
                  <button type="submit" disabled={resetStatus.loading} className="btn-primary text-xs py-2">
                    {resetStatus.loading ? 'Verifying...' : 'Verify OTP Code'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Enter New Password */}
            {resetStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <div>
                  <label className="form-label text-[11px]">New Password *</label>
                  <input
                    type="password"
                    required
                    minLength="6"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input text-xs py-2"
                  />
                </div>

                <div>
                  <label className="form-label text-[11px]">Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    minLength="6"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input text-xs py-2"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="submit" disabled={resetStatus.loading} className="btn-primary text-xs py-2">
                    {resetStatus.loading ? 'Updating Password...' : 'Reset & Update Password'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}


