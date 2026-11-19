import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { cpus: 2, agentUpgrade: "security" },
};

export default nextConfig;
