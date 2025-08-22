'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../src/lib/api';

function Banner({
  tone = 'info',
  children,
  onClose,
}: {
  tone?: 'info' | 'error' | 'success';
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const c =
    tone === 'error'
      ? 'bg-rose-500/15 text-rose-200 border-rose-400/30'
      : tone === 'success'
      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
      : 'bg-white/10 text-white/80 border-white/20';
  return (
    <div
      className={`mt-4 rounded-lg border px-3 py-2 text-sm flex items-start justify-between gap-3 ${c}`}
    >
      <div className="min-w-0">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-xs text-white/70 hover:text-white"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [tone, setTone] = useState<'info' | 'error' | 'success'>('info');

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg('');
    try {
      await api.login(email.trim(), pw);
      setTone('success');
      setMsg('Welcome back! Redirecting…');
      router.replace('/dashboard');
    } catch (err: any) {
      setTone('error');
      setMsg(err?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b1020] text-white">
      <div className="max-w-md mx-auto pt-20 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Sign in to Smelinx</h1>
          <p className="mt-1 text-white/60">
            Manage your APIs and deprecations in one place
          </p>
        </div>

        <form
          onSubmit={doLogin}
          className="mt-8 rounded-2xl border border-white/10 p-5 bg-white/[0.04]"
        >
          <label className="block text-xs text-white/70">Email</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />

          <label className="block text-xs text-white/70 mt-4">Password</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="current-password"
            required
          />

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          {msg && (
            <Banner tone={tone} onClose={() => setMsg('')}>
              {msg}
            </Banner>
          )}
        </form>

        <div className="mt-6 text-center text-sm text-white/60">
          <Link className="hover:underline" href="/signup">
            Create account
          </Link>
          <span className="mx-2">•</span>
          <Link className="hover:underline" href="/legal/privacy">
            Privacy
          </Link>
          <span className="mx-2">•</span>
          <Link className="hover:underline" href="/legal/terms">
            Terms
          </Link>
        </div>
      </div>
    </main>
  );
}
