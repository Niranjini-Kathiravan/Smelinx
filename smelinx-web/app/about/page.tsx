import { Bell, Building2, Gauge, ShieldCheck, Users } from "lucide-react";
import Section from "@/components/Section";
import { Feature } from "@/components/Feature";

export const metadata = { title: "About — Smelinx" };

export default function AboutPage() {
  return (
    <div className="py-12">
      <Section>
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Product
          </span>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">What is Smelinx?</h1>
          <p className="mt-3 text-gray-700 leading-7">
            Smelinx is an open‑source platform that simplifies API lifecycle management. It helps
            providers register APIs, track multiple versions, manage status transitions (Active → Deprecated → Sunset),
            and schedule automated deprecation notifications to consumers. API providers stay in control,
            and consumers are never surprised.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          <Feature icon={<Gauge size={18} />} title="Version tracking">
            Create APIs and add versions with status, notes, and key dates (deprecate/sunset).
          </Feature>
          <Feature icon={<Bell size={18} />} title="Automated notices">
            Send scheduled email notifications (30/7/1 days before sunset) via SendGrid/Mailgun.
          </Feature>
          <Feature icon={<Users size={18} />} title="Consumers registry">
            Manage consumers with contacts and link them to the APIs they rely on.
          </Feature>
          <Feature icon={<ShieldCheck size={18} />} title="Security by default">
            Email+password auth, JWT cookies, org scoping, and role‑based access control.
          </Feature>
          <Feature icon={<Building2 size={18} />} title="Self‑host or SaaS">
            Run locally with Docker or host a managed demo. Free tier supports up to 10 APIs.
          </Feature>
        </div>

        <div className="prose prose-slate mt-12">
          <h2>Why teams use Smelinx</h2>
          <ul>
            <li><strong>Clarity:</strong> A single source of truth for API versions and status.</li>
            <li><strong>Reliability:</strong> Automated reminders ensure consumers are notified on time.</li>
            <li><strong>Trust:</strong> Clear communication prevents breaking changes from blindsiding clients.</li>
          </ul>
          <h2>How it works</h2>
          <ol>
            <li>Register an API and add versions.</li>
            <li>Set status and key dates (deprecate/sunset).</li>
            <li>Link consumers who rely on those versions.</li>
            <li>Enable notice schedule (30/7/1 days). We send emails and log results.</li>
          </ol>
          <h2>Open source</h2>
          <p>
            Smelinx is built with Go (backend) and Next.js (frontend). It’s open to contributions and
            designed for easy self‑hosting.
          </p>
        </div>
      </Section>
    </div>
  );
}
