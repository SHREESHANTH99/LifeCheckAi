import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  env: {
    RESTART_TRIGGER: "2"
  }
};

export default nextConfig;
