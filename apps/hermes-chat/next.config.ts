import type { NextConfig } from "next";

const nextConfig: NextConfig = {
<<<<<<< HEAD
  transpilePackages: ["@platform/ui", "@platform/utils"],
=======
  output: "standalone",
  transpilePackages: ["@hermes/api", "@hermes/ui", "@hermes/tailwind-config"],
>>>>>>> main
};

export default nextConfig;
