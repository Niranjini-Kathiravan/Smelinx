// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../src/lib/api';
import type { APIItem } from '../../src/lib/api'; // <-- use the exported type to avoid mismatches

type Me = { user_id: string; org_id: string; role: string };

export default function Dashboard() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [apis, setApis] = useState<APIItem[]>([]);
  const [msg, setMsg] = useState('');

  // Create form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [docsUrl, setDocsUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [ownerTeam, setOwnerTeam] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const m = await api.me();
        setMe(m);
        const list = await api.listApis();
        setApis(list ?? []); // list can be null
      } catch (e: any) {
        if (e.status === 401) router.replace('/login');
        else setMsg(e.message || 'Load failed');
      }
    })();
  }, [router]);

  async function addApi() {
    setMsg('');
    try {
      const created = await api.createApi({
        name: name.trim(),
        description: description.trim() || undefined,
        base_url: baseUrl.trim() || undefined,
        docs_url: docsUrl.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        owner_team: ownerTeam.trim() || undefined,
      });
      // Prepend new item
      setApis(prev => [created as APIItem, ...prev]);
      // Reset form
      setName('');
      setDescription('');
      setBaseUrl('');
      setDocsUrl('');
      setContactEmail('');
      setOwnerTeam('');
    } catch (e: any) {
      setMsg(e.message || 'Create failed');
    }
  }

  async function logout() {
    await api.logout();
    // Clear presence cookie in client (middleware checks smx)
    document.cookie = 'smx=; Path=/; Max-Age=0; SameSite=Lax';
    router.replace('/login');
  }

  if (!me) return <main className="p-6">Loading…</main>;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your APIs</h1>
          <p className="mt-1 text-white/60 text-sm">
            User: {me.user_id} · Org: {me.org_id} · Role: {me.role}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/"
            className="rounded border border-white/20 text-white/80 hover:text-white px-4 py-2"
            title="Go to Smelinx site"
          >
            ← Back to site
          </Link>
          <button
            className="rounded border border-white/20 text-white/80 hover:text-white px-4 py-2"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Create API */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-soft">
        <div className="text-sm text-white/70">Create API</div>
        <h3 className="text-lg font-medium">Register a new API</h3>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs text-white/70">Name</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
              placeholder="e.g. Billing API"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-white/70">Owner team</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
              placeholder="e.g. Payments Platform"
              value={ownerTeam}
              onChange={e => setOwnerTeam(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-white/70">Description</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
              placeholder="Short description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-white/70">Base URL</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
              placeholder="https://api.example.com"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-white/70">Docs URL</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
              placeholder="https://docs.example.com/billing"
              value={docsUrl}
              onChange={e => setDocsUrl(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-white/70">Contact email</label>
            <input
              className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
              placeholder="owner@yourcompany.com"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            className="rounded-xl bg-brand hover:bg-brand-dark text-white px-4 py-2"
            onClick={addApi}
            disabled={!name.trim()}
          >
            Add
          </button>
          {msg && <span className="text-red-400 text-sm">{msg}</span>}
        </div>
      </div>

      {/* APIs table */}
      <div className="mt-8 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/80">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Description</th>
              <th className="text-left px-4 py-2">Base URL</th>
              <th className="text-left px-4 py-2">Docs</th>
              <th className="text-left px-4 py-2">Owner</th>
              <th className="text-left px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {apis.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-white/50">
                  No APIs yet — create your first one above.
                </td>
              </tr>
            ) : (
              apis.map(a => (
                <tr key={a.id} className="hover:bg-white/5">
                  <td className="px-4 py-2">
                    <Link
                      href={`/dashboard/apis/${a.id}`}
                      className="underline decoration-white/30 hover:decoration-white"
                      title="Open API details"
                    >
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{a.description || '—'}</td>
                  <td className="px-4 py-2">
                    {a.base_url ? (
                      <a
                        href={a.base_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-white/30 hover:decoration-white"
                        title={a.base_url}
                      >
                        {truncateUrl(a.base_url)}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {a.docs_url ? (
                      <a
                        href={a.docs_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-white/30 hover:decoration-white"
                        title={a.docs_url}
                      >
                        Docs
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2">{a.owner_team || '—'}</td>
                  <td className="px-4 py-2">
                    {a.created_at ? new Date(a.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/* ---------------- helpers ---------------- */

function truncateUrl(u?: string | null, max = 28) {
  if (!u) return '';
  const s = u.replace(/^https?:\/\//, '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
