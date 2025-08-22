import { ReactNode } from "react";

export function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 grid place-items-center rounded-lg bg-brand/10 text-brand">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-gray-600 mt-3 text-sm leading-6">{children}</p>
    </div>
  );
}
