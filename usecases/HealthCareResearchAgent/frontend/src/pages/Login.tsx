import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FlaskConical, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { setLogin } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Invalid credentials');
      }

      const data = await res.json();
      // Store credentials
      setLogin(data.access_token, data.role, data.name);
      navigate('/workspace');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[var(--bg-main)] p-4 relative overflow-hidden">
      {/* Background ambient radial gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[var(--primary-glow)] blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[var(--secondary-glow)] blur-[128px]" />

      <div className="w-full max-w-md glass-panel p-8 slide-in z-10">
        {/* Brand logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[var(--primary-glow)] border border-[var(--primary)] flex items-center justify-center pulse-glow">
            <FlaskConical className="w-8 h-8 text-[var(--primary)]" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold font-['Outfit'] tracking-wide gradient-text">
              AURA
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Enterprise Healthcare Research Copilot
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-6">
            <AlertCircle className="w-4 h-4" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@enterprise.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-sidebar)] text-sm text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--primary)] transition-colors duration-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-sidebar)] text-sm text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--primary)] transition-colors duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--bg-main)] font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 mt-4 hover:shadow-[0_0_16px_var(--primary-glow)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Credentials...
              </>
            ) : (
              'Access Research Console'
            )}
          </button>
        </form>

        <div className="text-center text-xs mt-6 text-[var(--text-muted)]">
          Don't have an enterprise account?{' '}
          <Link to="/register" className="text-[var(--primary)] hover:underline font-semibold">
            Register Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
