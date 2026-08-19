import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default 1MB is too small for phone photos on work order attachments.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
