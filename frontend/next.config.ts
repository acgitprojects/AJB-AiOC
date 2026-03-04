import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  env: {
    NEXT_PUBLIC_API_URL: "",
  },
  transpilePackages: ["@ajb/contract"],
};

export default nextConfig;
