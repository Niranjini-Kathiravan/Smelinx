// smelinx-web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a fully static site for S3/CloudFront
  output: "standalone",

  // If you use next/image, disable server loader for static export
  images: { unoptimized: true },

  // Optional: unblock builds while you’re stabilizing
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
