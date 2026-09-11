import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@cinema/seat-engine", "@cinema/types", "@cinema/ui"],
	images: {
		remotePatterns: [
			{ protocol: "http", hostname: "localhost", pathname: "/**" },
			{ protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
			{ protocol: "https", hostname: "**", pathname: "/**" },
		],
	},
};

export default nextConfig;
