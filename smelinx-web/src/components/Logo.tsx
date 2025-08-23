import Image from "next/image";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.png"   // put logo in `public/logo.png`
        alt="Smelinx Logo"
        width={64}
        height={64}
        className="rounded-md"
      />
      <span className="text-2xl font-bold tracking-tight text-white">
  Smelinx
</span>

    </div>
  );
}
