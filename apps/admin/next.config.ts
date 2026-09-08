import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@cinema/seat-engine", "@cinema/types", "@cinema/ui"],
};

export default nextConfig;
