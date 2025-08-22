export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-6 w-6 rounded-md bg-gradient-to-br from-brand to-brand-dark" />
      <span className="font-semibold tracking-tight text-white">Smelinx</span>
    </div>
  );
}
