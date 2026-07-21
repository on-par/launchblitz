import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The e2e suite runs one dev server per site mode. Next refuses to start a
  // second dev server that shares a build dir, so each server gets its own.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: [
    "@launchblitz/db",
    "@launchblitz/ui",
    "@launchblitz/workflow",
  ],
};

export default nextConfig;
