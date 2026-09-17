import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, Pill, ArrowRight, Shield, ShieldAlert, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const { user: currentUser, token: currentToken, login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Pharmacist');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // System Status
  const [systemStatus, setSystemStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/api/auth/system-status');
      const data = await res.json();
      setSystemStatus(data);
    } catch (err) {
      console.error('Error fetching system status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, email, phone, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      if (systemStatus?.isFirstSetup) {
        login(data.token, data.user);
        navigate('/dashboard');
      } else {
        setSuccessMsg(`Success! Created ${data.user.role} account for ${data.user.name}.`);
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        fetchSystemStatus();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isAdminLoggedIn = currentUser?.role === 'Admin';

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full glass-panel p-8 relative border-emerald-500/20">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-emerald-500/30">
            <Pill className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Staff & Owner Registration</h2>
          <p className="text-xs text-emerald-400/80 font-medium mt-1">PharmaCompanion Account Authorization</p>
        </div>

        {/* System Status Banner */}
        {systemStatus?.isFirstSetup || !systemStatus?.hasAdmin ? (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <span><strong>Primary Setup Mode:</strong> As the first user, your account will automatically be created with <strong>Primary Admin / Pharmacy Owner</strong> privileges.</span>
          </div>
        ) : isAdminLoggedIn ? (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Logged in as <strong>Admin ({currentUser.name})</strong>. You can register new Pharmacist or Owner accounts below.</span>
          </div>
        ) : null}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            {successMsg}
          </div>
        )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Full Name *</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 absolute left-3.5 pointer-events-none text-gray-400 z-10" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Ananya Sen"
                    className="form-input has-icon"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Email Address *</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 absolute left-3.5 pointer-events-none text-gray-400 z-10" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ananya@pharmacy.com"
                    className="form-input has-icon"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Password *</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3.5 pointer-events-none text-gray-400 z-10" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-input has-icon"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Account Role</label>
                <div className="relative flex items-center">
                  <Shield className="w-4 h-4 absolute left-3.5 pointer-events-none text-gray-400 z-10" />
                  <select
                    value={role}
                    disabled={systemStatus?.isFirstSetup}
                    onChange={(e) => setRole(e.target.value)}
                    className="form-input has-icon disabled:opacity-60"
                  >
                    {systemStatus?.isFirstSetup ? (
                      <option value="Admin">Pharmacy Owner (Admin) - Auto First Setup</option>
                    ) : (
                      <>
                        <option value="Pharmacist">Pharmacist</option>
                        <option value="Admin">Admin / Additional Owner</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary justify-center py-2.5 mt-2 text-sm"
              >
                {loading ? 'Creating Account...' : systemStatus?.isFirstSetup ? 'Complete Primary Owner Registration' : 'Add Staff Member'} <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
