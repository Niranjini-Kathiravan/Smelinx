'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../src/lib/api';
import { createDemoAccountLoginAndSeed } from '../../src/lib/demo';

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

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [orgName, setOrgName] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [tone, setTone] = useState<'info' | 'error' | 'success'>('info');

  async function doSignup(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg('');
    try {
      await api.signup(email.trim(), pw, orgName.trim());
      setTone('success');
      setMsg('Account created! Redirecting to login…');
      router.replace('/login');
    } catch (err: any) {
      setTone('error');
      setMsg(err?.message || 'Signup failed');
    } finally {
      setBusy(false);
    }
  }

  async function tryDemo() {
    if (demoBusy) return;
    setDemoBusy(true);
    setTone('info');
    setMsg('Creating demo account…');
    try {
      await createDemoAccountLoginAndSeed();
      setTone('success');
      setMsg('Demo ready! Redirecting…');
      router.replace('/dashboard');
    } catch (err: any) {
      setTone('error');
      setMsg(err?.message || 'Could not start demo');
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b1020] text-white">
      <div className="max-w-md mx-auto pt-20 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Create your Smelinx account</h1>
          <p className="mt-1 text-white/60">Start managing API versions in minutes</p>
        </div>

        <form
          onSubmit={doSignup}
          className="mt-8 rounded-2xl border border-white/10 p-5 bg-white/[0.04]"
        >
          <label className="block text-xs text-white/70">Organization</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />

          <label className="block text-xs text-white/70 mt-4">Email</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="block text-xs text-white/70 mt-4">Password</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2"
          >
            {busy ? 'Creating account…' : 'Sign up'}
          </button>

          {msg && (
            <Banner tone={tone} onClose={() => setMsg('')}>
              {msg}
            </Banner>
          )}
        </form>

        <div className="mt-6 rounded-2xl border border-white/10 p-5 bg-white/[0.04]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Just exploring?</h3>
              <p className="text-sm text-white/70">
                Launch a sandbox with sample APIs & notifications.
              </p>
            </div>
            <button
              onClick={tryDemo}
              disabled={demoBusy}
              className="rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2"
            >
              {demoBusy ? 'Starting…' : 'Try demo'}
            </button>
          </div>
          <p className="mt-3 text-[11px] text-white/50">
            No signup needed — we’ll spin up a disposable account with sample data.
          </p>
        </div>

        <div className="mt-6 text-center text-sm text-white/60">
          <Link className="hover:underline" href="/login">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
