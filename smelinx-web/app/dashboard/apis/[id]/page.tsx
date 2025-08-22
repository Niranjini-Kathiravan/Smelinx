'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type APIItem, type Version, type Notification } from '../../../../src/lib/api';

/* ---------- Little UI bits ---------- */

function Badge({
  tone = 'default',
  children,
}: {
  tone?: 'default' | 'green' | 'amber' | 'red';
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
      : tone === 'amber'
      ? 'bg-amber-500/15 text-amber-200 ring-amber-500/30'
      : tone === 'red'
      ? 'bg-rose-500/15 text-rose-200 ring-rose-500/30'
      : 'bg-white/10 text-white/80 ring-white/20';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ring-1 ${toneClass}`}>
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: Version['status'] }) {
  if (status === 'active') return <Badge tone="green">Active</Badge>;
  if (status === 'deprecated') return <Badge tone="amber">Deprecated</Badge>;
  return <Badge tone="red">Sunset</Badge>;
}

function Card({
  children,
  className = '',
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-soft ${className}`}>
      {(title || subtitle || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-white/60">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1020] p-5 shadow-hard">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-white/60 hover:text-white text-sm">✕</button>
          </div>
          <div className="mt-4">{children}</div>
          {footer && <div className="mt-5 flex items-center justify-end gap-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

/** Convert `<input type="datetime-local">` value to RFC3339 (UTC) */
function toRFC3339UTC(localValue: string): string | null {
  if (!localValue) return null;
  const d = new Date(localValue); // treated as local time
  const t = d.getTime();
  if (isNaN(t)) return null;
  return d.toISOString(); // RFC3339 / ISO 8601 in UTC (e.g., 2025-08-17T12:30:00.000Z)
}

/* ---------- Page ---------- */

export default function ApiDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // API meta
  const [apiMeta, setApiMeta] = useState<APIItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [docsUrl, setDocsUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [ownerTeam, setOwnerTeam] = useState('');

  // Versions
  const [versions, setVersions] = useState<Version[]>([]);
  const [ver, setVer] = useState('');
  const [status, setStatus] = useState<Version['status']>('active');
  const [sunset, setSunset] = useState<string>(''); // YYYY-MM-DD

  // Notifications
  const [notes, setNotes] = useState<Notification[]>([]);
  const [noteType, setNoteType] = useState<Notification['type']>('deprecate');
  const [selectedVersionId, setSelectedVersionId] = useState<string>(''); // ensure string, never undefined
  const [scheduledAt, setScheduledAt] = useState<string>(''); // datetime-local string
  const [scheduleHint, setScheduleHint] = useState<string>(''); // validation hint

  // UI state
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals for version edit/delete + API delete
  const [editOpen, setEditOpen] = useState(false);
  const [editFor, setEditFor] = useState<Version | null>(null);
  const [editStatus, setEditStatus] = useState<Version['status']>('active');
  const [editSunset, setEditSunset] = useState<string>('');
  const [deleteVOpen, setDeleteVOpen] = useState(false);
  const [deleteV, setDeleteV] = useState<Version | null>(null);
  const [deleteAPIOpen, setDeleteAPIOpen] = useState(false);

  // Derived lists
  const active = useMemo(() => versions.filter(v => v.status === 'active'), [versions]);
  const deprecated = useMemo(() => versions.filter(v => v.status === 'deprecated'), [versions]);
  const sunsetList = useMemo(() => versions.filter(v => v.status === 'sunset'), [versions]);

  useEffect(() => {
    (async () => {
      try {
        await api.me();
        const meta = await api.getApi(id);
        setApiMeta(meta);
        setEditName(meta?.name || '');
        setEditDesc(meta?.description || '');
        setBaseUrl(meta?.base_url || '');
        setDocsUrl(meta?.docs_url || '');
        setContactEmail(meta?.contact_email || '');
        setOwnerTeam(meta?.owner_team || '');

        const v = await api.listVersions(id);
        setVersions(v || []);

        // default selected version for notifications: first non-sunset, else first
        const firstV = (v || []).find(x => x.status !== 'sunset') || (v || [])[0];
        setSelectedVersionId(firstV ? firstV.id : '');

        const n = await api.listNotifications(id);
        setNotes(n || []);
      } catch (e: any) {
        if (e.status === 401) router.replace('/login');
        else setMsg(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  /* ----- API meta ----- */
  async function saveApiMeta() {
    if (!apiMeta) return;
    try {
      const updated = await api.updateApi(apiMeta.id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        base_url: baseUrl.trim() || undefined,
        docs_url: docsUrl.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        owner_team: ownerTeam.trim() || undefined,
      });
      setApiMeta(updated);
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    }
  }

  async function confirmDeleteAPI() {
    if (!apiMeta) return;
    try {
      await api.deleteApi(apiMeta.id);
      router.replace('/dashboard');
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  }

  /* ----- Versions ----- */
  async function addVersion() {
    setMsg('');
    try {
      const created = await api.createVersion(id, ver.trim(), status, sunset || undefined);
      setVersions(prev => [created, ...prev]);
      setVer('');
      setStatus('active');
      setSunset('');
      // if there was no selection yet, pick this new version
      setSelectedVersionId(prev => (prev || created.id));
    } catch (e: any) {
      setMsg(e.message || 'Create failed');
    }
  }

  function openEdit(v: Version) {
    setEditFor(v);
    setEditStatus(v.status);
    setEditSunset(v.sunset_date ?? '');
    setEditOpen(true);
  }

  async function applyEdit() {
    if ((editStatus === 'deprecated' || editStatus === 'sunset') && !editSunset) {
      alert('Please provide a sunset date (YYYY-MM-DD) to deprecate or sunset.');
      return;
    }
    if (!editFor) return;
    try {
      const updated = await api.updateVersionStatus(editFor.id, editStatus, editSunset || undefined);
      setVersions(prev => prev.map(x => (x.id === editFor.id ? updated : x)));
      setEditOpen(false);
    } catch (e: any) {
      alert(e.message || 'Update failed');
    }
  }

  function askDeleteVersion(v: Version) {
    setDeleteV(v);
    setDeleteVOpen(true);
  }

  async function confirmDeleteVersion() {
    if (!deleteV) return;
    try {
      await api.deleteVersion(deleteV.id);
      setVersions(prev => prev.filter(x => x.id !== deleteV.id));
      // if we deleted the selected version for notifications, clear or reselect
      setSelectedVersionId(prev => (prev === deleteV.id ? (versions.find(x => x.id !== deleteV.id)?.id || '') : prev));
      setDeleteVOpen(false);
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  }

  /* ----- Notifications ----- */
  async function scheduleNote() {
    setScheduleHint('');
    if (!selectedVersionId) {
      setScheduleHint('Pick a version for the notification.');
      return;
    }
    if (!scheduledAt) {
      setScheduleHint('Choose a date & time.');
      return;
    }

    // Convert to RFC3339 UTC for backend
    const rfc3339 = toRFC3339UTC(scheduledAt);
    if (!rfc3339) {
      setScheduleHint('Invalid date/time. Please select again.');
      return;
    }

    try {
      const created = await api.createNotification(id, {
        version_id: selectedVersionId,
        type: noteType,
        scheduled_at: rfc3339,
      });
      setNotes(prev => [created, ...prev]);
      setScheduledAt('');
      setScheduleHint(''); // clear hint
    } catch (e: any) {
      setScheduleHint(e.message || 'Could not schedule');
    }
  }

  async function setNoteStatus(note: Notification, status: Notification['status']) {
    try {
      const updated = await api.updateNotificationStatus(note.id, status);
      setNotes(prev => prev.map(n => (n.id === note.id ? updated : n)));
    } catch (e: any) {
      alert(e.message || 'Update failed');
    }
  }

  if (loading) return <main className="p-6">Loading…</main>;

  return (
    <main className="px-4 md:px-6 pb-12 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="pt-6 md:pt-9 text-sm text-white/70">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span className="mx-2">/</span>
        <span className="text-white/90">API</span>
      </div>

      {/* Top: API meta + create version */}
      <div className="mt-4 grid gap-6 md:grid-cols-12">
        <Card
          className="md:col-span-8"
          title={apiMeta?.name || 'API'}
          subtitle={apiMeta?.description || '—'}
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:text-white"
              >
                ← Back
              </Link>
              <button
                onClick={() => setDeleteAPIOpen(true)}
                className="rounded-lg border border-red-400/30 text-red-300 hover:text-red-200 hover:bg-red-400/10 px-3 py-1.5 text-sm"
              >
                Delete API
              </button>
            </div>
          }
        >
          <p className="mt-1 text-white/50 text-xs">ID: {apiMeta?.id}</p>

          {/* Inline edit */}
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs text-white/70">Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-white/70">Description</label>
              <input
                className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
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
                placeholder="https://docs.example.com"
                value={docsUrl}
                onChange={e => setDocsUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-white/70">Contact email</label>
              <input
                className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
                placeholder="team@example.com"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-white/70">Owner team</label>
              <input
                className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
                placeholder="Platform, Payments, etc."
                value={ownerTeam}
                onChange={e => setOwnerTeam(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3">
            <button
              onClick={saveApiMeta}
              className="rounded-xl bg-brand hover:bg-brand-dark text-white px-4 py-2"
            >
              Save API details
            </button>
          </div>
        </Card>

        <Card
          className="md:col-span-4"
          title="Create version"
          subtitle="First version should be Active. When a successor is ready, deprecate the older one and set a sunset date."
        >
          <div className="mt-4 grid gap-3">
            <div>
              <label className="block text-xs text-white/70">Version</label>
              <input
                className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
                placeholder="e.g. v1, 2025-08-01"
                value={ver}
                onChange={e => setVer(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-white/70">Status</label>
              <select
                className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
                value={status}
                onChange={e => setStatus(e.target.value as Version['status'])}
              >
                <option value="active">Active</option>
                <option value="deprecated">Deprecated</option>
                <option value="sunset">Sunset</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/70">Sunset date (optional)</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
                value={sunset}
                onChange={e => setSunset(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              className="rounded-xl bg-brand hover:bg-brand-dark text-white px-4 py-2"
              onClick={addVersion}
              disabled={!ver.trim()}
            >
              Add version
            </button>
            {msg && <span className="ml-3 text-sm text-red-400">{msg}</span>}
          </div>
        </Card>
      </div>

      {/* Middle: Notifications */}
      <div className="mt-6">
        <Card
          title="Notifications"
          subtitle="Queue announcements tied to specific versions."
        >
          <div className="mt-4 grid gap-4 md:grid-cols-12">
            {/* schedule form */}
            <div className="md:col-span-6">
              <div className="grid gap-3">
                <div>
                  <label className="block text-xs text-white/70">Version</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
                    value={selectedVersionId}
                    onChange={e => setSelectedVersionId(e.target.value)}
                  >
                    <option value="" disabled>
                      {versions.length ? 'Select a version' : 'No versions yet'}
                    </option>
                    {versions.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.version} · {v.status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/70">Type</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
                    value={noteType}
                    onChange={e => setNoteType(e.target.value as Notification['type'])}
                  >
                    <option value="deprecate">Deprecation notice</option>
                    <option value="sunset">Sunset notice</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/70">Schedule at</label>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-white/50">
                    We’ll send this at the chosen local time. It’s saved as RFC 3339 UTC (e.g., <code>2025-08-17T12:30:00Z</code>).
                  </p>
                  {scheduleHint && <p className="mt-1 text-xs text-rose-300">{scheduleHint}</p>}
                </div>
                <div>
                  <button
                    onClick={scheduleNote}
                    disabled={!selectedVersionId || !scheduledAt}
                    className="rounded-xl bg-brand hover:bg-brand-dark text-white px-4 py-2"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            </div>

            {/* list */}
            <div className="md:col-span-6">
              {notes.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                  No notifications yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {notes.map(n => (
                    <li key={n.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm text-white/80">
                            {n.type === 'deprecate' ? 'Deprecation' : 'Sunset'} ·{' '}
                            <span className="text-white/60">{new Date(n.scheduled_at).toLocaleString()}</span>
                          </div>
                          <div className="mt-1 text-xs text-white/60">
                            Version:{' '}
                            {versions.find(v => v.id === n.version_id)?.version || n.version_id}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={n.status === 'pending' ? 'amber' : n.status === 'sent' ? 'green' : 'red'}>
                            {n.status}
                          </Badge>
                          <div className="hidden md:flex items-center gap-2">
                            <button
                              onClick={() => setNoteStatus(n, 'pending')}
                              className="rounded border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:text-white"
                            >
                              Pending
                            </button>
                            <button
                              onClick={() => setNoteStatus(n, 'sent')}
                              className="rounded border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:text-white"
                            >
                              Sent
                            </button>
                            <button
                              onClick={() => setNoteStatus(n, 'canceled')}
                              className="rounded border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* mobile status actions */}
                      <div className="mt-3 md:hidden flex items-center gap-2">
                        <button
                          onClick={() => setNoteStatus(n, 'pending')}
                          className="rounded border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:text-white"
                        >
                          Pending
                        </button>
                        <button
                          onClick={() => setNoteStatus(n, 'sent')}
                          className="rounded border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:text-white"
                        >
                          Sent
                        </button>
                        <button
                          onClick={() => setNoteStatus(n, 'canceled')}
                          className="rounded border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom: Version sections */}
      <div className="mt-8 grid gap-8">
        {active.length > 0 && (
          <VersionSection title="Active" badge={<Badge tone="green">Current</Badge>}>
            {active.map(v => (
              <VersionCard key={v.id} v={v} onEdit={() => openEdit(v)} onDelete={() => askDeleteVersion(v)} />
            ))}
          </VersionSection>
        )}

        {deprecated.length > 0 && (
          <VersionSection title="Deprecated" badge={<Badge tone="amber">Migration</Badge>}>
            {deprecated.map(v => (
              <VersionCard key={v.id} v={v} onEdit={() => openEdit(v)} onDelete={() => askDeleteVersion(v)} />
            ))}
          </VersionSection>
        )}

        {sunsetList.length > 0 && (
          <VersionSection title="Sunset" badge={<Badge tone="red">Finalized</Badge>}>
            {sunsetList.map(v => (
              <VersionCard key={v.id} v={v} onEdit={() => openEdit(v)} onDelete={() => askDeleteVersion(v)} />
            ))}
          </VersionSection>
        )}

        {versions.length === 0 && (
          <Card>
            <div className="text-center py-10">
              <div className="text-white/70">No versions yet</div>
              <p className="mt-1 text-white/50 text-sm">Create your first version using the panel above.</p>
            </div>
          </Card>
        )}
      </div>

      {/* Edit version modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Change status ${editFor ? `· ${editFor.version}` : ''}`}
        footer={
          <>
            <button
              className="rounded-lg border border-white/20 px-4 py-2 text-white/80 hover:text-white"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </button>
            <button className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark" onClick={applyEdit}>
              Apply
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/70">Status</label>
            <select
              className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
              value={editStatus}
              onChange={e => setEditStatus(e.target.value as Version['status'])}
            >
              <option value="active">Active</option>
              <option value="deprecated">Deprecated</option>
              <option value="sunset">Sunset</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/70">
              Sunset date {editStatus !== 'active' && <span className="text-rose-300">*</span>}
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-white/20 bg-white text-black px-3 py-2"
              value={editSunset}
              onChange={e => setEditSunset(e.target.value)}
            />
            <p className="mt-1 text-xs text-white/50 leading-relaxed">
              Deprecate = announce end‑of‑life; Sunset = disable on/after the sunset date.
            </p>
          </div>
        </div>
      </Modal>

      {/* Delete version modal */}
      <Modal
        open={deleteVOpen}
        onClose={() => setDeleteVOpen(false)}
        title="Delete version?"
        footer={
          <>
            <button
              className="rounded-lg border border-white/20 px-4 py-2 text-white/80 hover:text-white"
              onClick={() => setDeleteVOpen(false)}
            >
              Cancel
            </button>
            <button className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-500" onClick={confirmDeleteVersion}>
              Delete
            </button>
          </>
        }
      >
        <p className="text-white/80">
          This will permanently remove version <b>{deleteV?.version}</b>. This action cannot be undone.
        </p>
      </Modal>

      {/* Delete API modal */}
      <Modal
        open={deleteAPIOpen}
        onClose={() => setDeleteAPIOpen(false)}
        title="Delete this API?"
        footer={
          <>
            <button
              className="rounded-lg border border-white/20 px-4 py-2 text-white/80 hover:text-white"
              onClick={() => setDeleteAPIOpen(false)}
            >
              Cancel
            </button>
            <button className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-500" onClick={confirmDeleteAPI}>
              Delete API
            </button>
          </>
        }
      >
        <p className="text-white/80">
          Deleting <b>{apiMeta?.name}</b> will remove all versions and notifications. You can’t undo this.
        </p>
      </Modal>
    </main>
  );
}

/* ---------- Subcomponents ---------- */

function VersionSection({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-medium">{title}</h2>
        {badge}
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function VersionCard({
  v,
  onEdit,
  onDelete,
}: {
  v: Version;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const guidance: string[] =
    v.status === 'active'
      ? ['Default for new integrations.', 'When replacement is ready: set Deprecated + sunset date.']
      : v.status === 'deprecated'
      ? [
          `Communicate sunset${
            v.sunset_date ? ` (${new Date(v.sunset_date).toLocaleDateString()})` : ''
          }.`,
          'Encourage migration to latest Active version.',
        ]
      : ['Retired; do not use.', 'Keep docs only for historical reference.'];

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base md:text-lg font-semibold">{v.version}</h3>
            <StatusBadge status={v.status} />
          </div>
          <div className="mt-2 text-xs text-white/60">Created {new Date(v.created_at).toLocaleString()}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/90 hover:text-white hover:bg-white/5"
          >
            Change status
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg border border-red-400/30 text-red-300 hover:text-red-200 hover:bg-red-400/10 px-3 py-1.5 text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-5 text-sm">
        <div className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-3">
          <div className="text-white/70">Sunset date</div>
          <div className="text-white">{v.sunset_date ? new Date(v.sunset_date).toLocaleDateString() : '—'}</div>
        </div>

        <div className="mt-4">
          <div className="text-white/70 text-xs">Guidance</div>
          <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <ul className="list-disc list-inside text-white/80 text-sm leading-relaxed space-y-1.5 max-w-prose">
              {guidance.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}