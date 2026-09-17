import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, Pill, ArrowRight, ShieldCheck, ShieldAlert, CheckCircle2, LockIcon } from 'lucide-react';

export default function RegisterPage() {
  const { user: currentUser, login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Setup Status
  const [setupStatus, setSetupStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const fetchSetupStatus = async () => {
    try {
      const res = await fetch('/api/auth/setup-status');
      const data = await res.json();
      setSetupStatus(data);
    } catch (err) {
      console.error('Error fetching setup status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Backend automatically assigns ADMIN to first user. No role field is sent.
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-emerald-400 font-medium text-xs">
        Checking System Initial Setup Status...
      </div>
    );
  }

  const isPublicRegistrationDisabled = setupStatus && !setupStatus.isFirstSetup;

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full glass-panel p-8 relative border-emerald-500/20">
        
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-emerald-500/30">
            <Pill className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">First-Admin Setup</h2>
          <p className="text-xs text-emerald-400/80 font-medium mt-1">PharmaCompanion System Bootstrapping</p>
        </div>

        {isPublicRegistrationDisabled ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-2">
              <LockIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Public Registration Disabled</h3>
            <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
              An administrator account already exists. Public registration has been disabled for security. Please contact the pharmacy administrator to obtain your pharmacist account.
            </p>
            <div className="pt-4">
              <Link to="/login" className="btn-primary w-full justify-center py-2.5 text-xs font-bold">
                Return to Login Screen →
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-xs">First User Setup Detected</p>
                <p className="text-[11px] text-emerald-400/90 mt-0.5">
                  As the first user on this pharmacy system, your account will automatically be assigned <strong>ADMIN</strong> privileges.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label text-xs">Full Name *</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 absolute left-3.5 pointer-events-none text-gray-400 z-10" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Raghav Goyal"
                    className="form-input has-icon text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="form-label text-xs">Email Address (Admin User) *</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 absolute left-3.5 pointer-events-none text-gray-400 z-10" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@pharma.com"
                    className="form-input has-icon text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="form-label text-xs">Password *</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3.5 pointer-events-none text-gray-400 z-10" />
                  <input
                    type="password"
                    required
                    minLength="6"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-input has-icon text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="form-label text-xs">Confirm Password *</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3.5 pointer-events-none text-gray-400 z-10" />
                  <input
                    type="password"
                    required
                    minLength="6"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? 'Bootstrapping Admin Account...' : 'Register as Primary Admin'} <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              Already configured?{' '}
              <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-bold">
                Sign In to Account
              </Link>
            </p>
          </>
        )}

      </div>
    </div>
  );
}

