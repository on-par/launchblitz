import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: [
    "@launchblitz/db",
    "@launchblitz/ui",
    "@launchblitz/workflow",
  ],
};

export default nextConfig;
