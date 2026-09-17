import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Pill, ArrowRight, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const executeLogin = async (loginEmail, loginPassword) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
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

  const handleSubmit = (e) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  const handleQuickDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    executeLogin(demoEmail, demoPass);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full glass-panel p-8 relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-cyan-500/30">
            <Pill className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">Sign In to PharmaExpiry</h2>
          <p className="text-xs text-gray-400 mt-1">FEFO Pharmacy Management System</p>
        </div>

        {/* Quick Demo Preset Buttons */}
        <div className="mb-6 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block mb-2 text-center">
            ⚡ Quick 1-Click Evaluator Login:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('pharmacist@pharma.com', 'pharmacy123')}
              className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-cyan-300 text-xs font-semibold rounded-lg border border-cyan-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" /> Pharmacist
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin@pharma.com', 'admin123')}
              className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-blue-300 text-xs font-semibold rounded-lg border border-blue-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" /> Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 absolute left-3.5 pointer-events-none text-gray-400 z-10" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. pharmacist@pharma.com"
                className="form-input has-icon"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Password</label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary justify-center py-2.5 mt-2 text-sm"
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold">
            Register Account
          </Link>
        </p>
      </div>
    </div>
  );
}
