// smelinx-web/app/page.tsx
"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Section from "@/components/Section";
import Container from "@/components/Container";
import { Feature } from "@/components/Feature";
import {
  CheckCircle2,
  BellRing,
  ShieldCheck,
  SlidersHorizontal,
  LineChart,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import BrowserFrame from "@/components/BrowserFrame";

/* ------------------------ Simple Carousel ------------------------ */
function Carousel({
  slides,
  auto = true,
  intervalMs = 5000,
}: {
  slides: { src: string; alt: string }[];
  auto?: boolean;
  intervalMs?: number;
}) {
  const [i, setI] = useState(0);
  const last = slides.length - 1;

  const next = () => setI((v) => (v >= last ? 0 : v + 1));
  const prev = () => setI((v) => (v <= 0 ? last : v - 1));

  useEffect(() => {
    if (!auto || slides.length <= 1) return;
    const t = setInterval(next, intervalMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, intervalMs, slides.length]);

  // Keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative">
      <BrowserFrame>
        {/* Fixed-height wrapper to normalize differing image sizes */}
        <div className="relative h-[520px] md:h-[620px] bg-black/20 rounded-lg">
          <Image
            key={slides[i].src}
            src={slides[i].src}
            alt={slides[i].alt}
            fill
            sizes="(min-width: 768px) 1024px, 100vw"
            className="object-contain rounded-lg"
            priority
          />
        </div>
      </BrowserFrame>

      {/* Controls */}
      <button
        aria-label="Previous"
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/55 p-2 ring-1 ring-white/20 backdrop-blur"
      >
        <ChevronLeft className="text-white" size={18} />
      </button>
      <button
        aria-label="Next"
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 hover:bg-black/55 p-2 ring-1 ring-white/20 backdrop-blur"
      >
        <ChevronRight className="text-white" size={18} />
      </button>

      {/* Dots */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Go to slide ${idx + 1}`}
            onClick={() => setI(idx)}
            className={[
              "h-2.5 w-2.5 rounded-full ring-1 ring-white/30 transition",
              idx === i ? "bg-white/90" : "bg-white/30 hover:bg-white/50",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
/* ---------------------------------------------------------------- */

export default function Home() {
  const slides = useMemo(
    () => [
      { src: "/screenshots/dashboard.png", alt: "Smelinx dashboard: register and list APIs" },
      { src: "/screenshots/api-details.png", alt: "API detail: versions and scheduled notifications" },
    ],
    []
  );

  return (
    <>
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="hero-ring" />
        <Container className="pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Open-source • Self-hostable • Secure
            </span>
            <h1 className="mt-4 text-4xl md:text-6xl font-semibold leading-tight tracking-tight">
              Manage your <span className="text-brand">API lifecycle</span> with confidence.
            </h1>
            <p className="mt-5 text-body text-lg leading-7">
              Smelinx is the control center for API providers. Register services, track versions, and
              automate deprecation notices—keeping consumers informed and your team shipping faster.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="/signup"
                className="rounded-lg bg-brand px-5 py-3 text-sm font-medium text-white hover:bg-brand-dark shadow-soft"
              >
                Get started free
              </a>
              <a
                href="https://github.com/Niranjini-Kathiravan/smelinx"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/15 px-5 py-3 text-sm font-medium text-white/90 hover:text-white"
              >
                View on GitHub
              </a>
            </div>

            <p className="mt-4 text-xs text-white/50">No credit card • Self-host in minutes • Enterprise‑friendly</p>
          </div>
        </Container>
      </section>

      {/* DEMO CAROUSEL */}
      <Section id="demo" className="py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold">See Smelinx in action</h2>
        </div>

        <div className="mt-10">
          <Carousel slides={slides} />
        </div>
      </Section>

      {/* FEATURES */}
      <Section id="features" className="py-16 md:py-24">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-semibold">Everything you need to manage API versions</h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Feature icon={<CheckCircle2 size={18} />} title="Centralized Registry">
            Maintain a single source of truth for all APIs. Add owners, metadata, and contacts.
          </Feature>
          <Feature icon={<SlidersHorizontal size={18} />} title="Version Lifecycle">
            Mark versions Active, Deprecated, or Sunset with clear timelines visible to everyone.
          </Feature>
          <Feature icon={<BellRing size={18} />} title="Automated Notices">
            Schedule email notifications with delivery logs to keep clients in sync.
          </Feature>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Feature icon={<ShieldCheck size={18} />} title="Access Control">
            Built‑in roles for owners, admins, and members ensure safe, auditable changes.
          </Feature>
          <Feature icon={<LineChart size={18} />} title="Insights & Adoption">
            Track consumer adoption, migrations, and upcoming sunsets in one dashboard.
          </Feature>
          <Feature icon={<Mail size={18} />} title="Consumer Directory">
            Manage client contacts per API—so the right people get the right updates.
          </Feature>
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section id="how-it-works" className="py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="card-surface rounded-2xl p-6">
            <div className="text-sm text-white/60">Install</div>
            <h3 className="mt-2 text-2xl font-semibold">Self‑host in minutes</h3>
            <ol className="mt-4 space-y-2 text-body list-decimal list-inside">
              <li>Clone the repo & configure environment (SQLite or Postgres).</li>
              <li>Run backend (Go + chi) & frontend (Next.js + TailwindCSS).</li>
              <li>Invite your team, add APIs, and schedule notices.</li>
            </ol>
          </div>
          <div className="card-surface rounded-2xl p-6">
            <div className="text-sm text-white/60">Operate</div>
            <h3 className="mt-2 text-2xl font-semibold">Control the lifecycle</h3>
            <ul className="mt-4 space-y-3 text-body">
              <li>Central registry for APIs & versions</li>
              <li>Statuses: Active • Deprecated • Sunset</li>
              <li>Timed notifications with logs & history</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* OPEN SOURCE */}
      <Section id="open-source" className="py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold">Open‑source & enterprise‑ready</h2>
          <p className="mt-3 text-body">
            Install Smelinx inside your environment. You own the data—no lock‑in, no hidden costs.
            Start free (up to 10 APIs) and scale at your own pace.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a
              href="/signup"
              className="rounded-lg bg-brand px-5 py-3 text-sm font-medium text-white hover:bg-brand-dark shadow-soft"
            >
              Get started free
            </a>
              <a
                href="https://github.com/Niranjini-Kathiravan/smelinx"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/15 px-5 py-3 text-sm font-medium text-white/90 hover:text-white"
              >
                View on GitHub
              </a>
          </div>
        </div>
      </Section>

      <Footer />
    </>
  );
}
