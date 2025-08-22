// smelinx-web/src/lib/demo.ts
import { api } from './api';

/** RFC3339 helpers */
function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60_000);
}
function rfc3339(d: Date) {
  return d.toISOString();
}

/**
 * Seed some demo content for the current logged-in org.
 */
export async function seedDemoData() {
  const payments = await api.createApi({
    name: 'Payments API',
    description: 'Process charges, refunds, and payouts.',
    base_url: 'https://api.sandbox.payments.example.com',
    docs_url: 'https://docs.payments.example.com',
    contact_email: 'demo-contact@example.com',
    owner_team: 'Fintech Platform',
  });

  const billing = await api.createApi({
    name: 'Billing API',
    description: 'Subscriptions, invoices, and proration.',
    base_url: 'https://api.sandbox.billing.example.com',
    docs_url: 'https://docs.billing.example.com',
    contact_email: 'demo-billing@example.com',
    owner_team: 'Finance Engineering',
  });

  const today = new Date();
  const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

  const v2 = await api.createVersion(payments.id, 'v2', 'active');
  const v1 = await api.createVersion(
    payments.id,
    'v1',
    'deprecated',
    dateOnly(addMinutes(today, 60 * 24 * 30))
  );
  const b1 = await api.createVersion(billing.id, 'v1', 'active');

  // Past-due deprecation (fires soon)
  await api.createNotification(payments.id, {
    version_id: v1.id,
    type: 'deprecate',
    scheduled_at: rfc3339(addMinutes(new Date(), -3)),
  });

  // Future sunset
  await api.createNotification(payments.id, {
    version_id: v1.id,
    type: 'sunset',
    scheduled_at: rfc3339(addMinutes(new Date(), 90)),
  });

  return { payments, billing, versions: { v2, v1, b1 } };
}

/**
 * Create a disposable demo account, then login, then seed data.
 * If signup says the email exists, we just login and continue.
 */
export async function createDemoAccountLoginAndSeed() {
  const stamp = Date.now();
  const email = `demo+${stamp}@example.com`; // RFC-reserved domain
  const password = 'Passw0rd123';            // matches your rule
  const orgName = 'Smelinx Demo Org';

  try {
    // Send org_name (snake_case) because your Go backend expects that
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/auth/signup`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, org_name: orgName }),
    }).then(async (res) => {
      if (!res.ok && res.status !== 409) {
        throw new Error(await res.text());
      }
    });
  } catch (e: any) {
    if (!(e && (e.status === 409 || /exists|duplicate/i.test(e.message || '')))) {
      throw e; // real error
    }
  }

  // Always login explicitly (your flow is signup -> login -> dashboard)
  await api.login(email, password);

  // Now seed demo data
  await seedDemoData();

  return { email, password };
}
