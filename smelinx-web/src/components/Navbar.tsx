"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Container from "./Container";
import Logo from "./Logo";
import { api } from "../../src/lib/api"; // if your alias differs, use a relative import

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  // Detect presence cookie set on login (frontend flag the middleware can also read)
  useEffect(() => {
    const has = document.cookie.split("; ").some((c) => c.startsWith("smx="));
    setAuthed(has);
  }, [pathname]); // re-evaluate on route change

  async function handleLogout() {
    try {
      await api.logout(); // clears backend session cookie
    } catch {
      // ignore network errors on logout
    } finally {
      // Clear frontend presence cookie so middleware + navbar update
      document.cookie = "smx=; Path=/; Max-Age=0; SameSite=Lax";
      setAuthed(false);
      router.replace("/login");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1020]/70 backdrop-blur">
      <Container>
        <div className="h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" aria-label="Smelinx" className="flex items-center gap-2">
            <Logo />
          </Link>

          {/* Primary nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <Link href="#features" className="text-white/80 hover:text-white">Features</Link>
            <Link href="#how-it-works" className="text-white/80 hover:text-white">How it works</Link>
            <Link href="#open-source" className="text-white/80 hover:text-white">Open source</Link>
            <Link href="#contact" className="text-white/80 hover:text-white">Contact</Link>
          </nav>

          {/* Auth area */}
          {!authed ? (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-white/80 hover:text-white">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark shadow-soft"
              >
                Sign up
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/90 hover:text-white"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-white/80 hover:text-white"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </Container>
    </header>
  );
}
