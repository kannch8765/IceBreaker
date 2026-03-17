import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Useful for Firebase Hosting to handle routes correctly
  trailingSlash: true,
};

export default nextConfig;
