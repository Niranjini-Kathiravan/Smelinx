import * as React from "react";

export default function BrowserFrame({
  children,
  className = "",
  url = "https://smelinx.com",
}: {
  children: React.ReactNode;
  className?: string;
  url?: string;
}) {
  return (
    <div className={`rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-[#0b1020] ${className}`}>
      {/* top bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <div className="ml-3 min-w-0 flex-1">
          <div className="truncate rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            {url}
          </div>
        </div>
      </div>
      {/* content */}
      <div className="bg-black">{children}</div>
    </div>
  );
}
