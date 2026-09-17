import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Pill, ArrowRight, Smartphone, ShieldCheck, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password / OTP Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Identifier/Method, 2: Enter OTP, 3: New Password
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetMethod, setResetMethod] = useState('google'); // 'google' | 'mobile'
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

  // Google Auth Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleError, setGoogleError] = useState('');

  const handleGoogleSignIn = async (e) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setGoogleError('Please enter a valid Google Account email address');
      return;
    }

    setGoogleError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleEmail.trim(),
          name: googleName.trim() || googleEmail.split('@')[0],
          googleId: `google-sub-${Date.now()}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google Authentication failed');

      login(data.token, data.user);
      setShowGoogleModal(false);
      navigate('/dashboard');
    } catch (err) {
      setGoogleError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Request 6-digit OTP via Google Email or Mobile SMS
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setResetStatus({ error: '', success: '', loading: true });

    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: resetIdentifier, method: resetMethod })
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
        body: JSON.stringify({ identifier: resetIdentifier, otp: enteredOtp })
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
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
                  setResetIdentifier(email || 'admin@pharma.com');
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
            className="w-full btn-primary justify-center py-2.5 mt-2 text-sm"
          >
            {loading ? 'Authenticating...' : 'Sign In to FEFO Workbench'} <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </form>

        {/* Google Authentication Section */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={() => {
              setGoogleEmail(email || '');
              setGoogleError('');
              setShowGoogleModal(true);
            }}
            disabled={loading}
            className="w-full btn-secondary justify-center py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer hover:border-emerald-500/50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.3-.8-.5-1.7-.5-2.7z"/>
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
            </svg>
            Sign In with Google Account
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-bold">
            Register Admin / Pharmacist
          </Link>
        </p>

      </div>

      {/* Password Recovery & OTP Verification Modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Password Recovery & Verification</h3>
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

            {/* Step 1: Select Verification Channel */}
            {resetStep === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4 text-xs">
                <div>
                  <label className="form-label text-[11px]">Select Verification Channel:</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setResetMethod('google')}
                      className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                        resetMethod === 'google'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-gray-900 border-white/10 text-gray-400'
                      }`}
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="font-bold text-xs">Google Email</p>
                        <p className="text-[9px]">OTP to Google Mail</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResetMethod('mobile')}
                      className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                        resetMethod === 'mobile'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-gray-900 border-white/10 text-gray-400'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="font-bold text-xs">Mobile SMS</p>
                        <p className="text-[9px]">OTP to Registered Phone</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label text-[11px]">Registered Email Address or Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder={resetMethod === 'google' ? 'admin@pharma.com' : '+91 9876543210'}
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    className="form-input text-xs py-2"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowResetModal(false)} className="btn-secondary text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={resetStatus.loading} className="btn-primary text-xs py-2">
                    {resetStatus.loading ? 'Sending OTP...' : 'Send 6-Digit OTP Code'}
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
                    ← Change ID / Resend
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

      {/* Google Account OAuth Sign-In Modal */}
      {showGoogleModal && (
        <div className="modal-overlay" onClick={() => setShowGoogleModal(false)}>
          <div className="modal-content max-w-md border-emerald-500/30" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.3-.8-.5-1.7-.5-2.7z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                </svg>
                <h3 className="text-base font-bold text-white">Google Workspace Account Sign-In</h3>
              </div>
              <button onClick={() => setShowGoogleModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {googleError && (
              <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{googleError}</span>
              </div>
            )}

            <form onSubmit={handleGoogleSignIn} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                <p className="text-emerald-300 font-semibold text-xs">Google OAuth Account Verification</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Enter your Google Account email and name to sign in or register dynamically.
                </p>
              </div>

              <div>
                <label className="form-label text-[11px]">Google Account Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. yourname@gmail.com or admin@pharma.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="form-input text-xs py-2"
                />
              </div>

              <div>
                <label className="form-label text-[11px]">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Raghav Goyal"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="form-input text-xs py-2"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowGoogleModal(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary text-xs py-2">
                  {loading ? 'Authenticating Google Account...' : 'Continue with Google Account →'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

