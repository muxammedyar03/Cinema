import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	async rewrites() {
		const api = process.env.API_URL?.replace(/\/$/, "");
		if (!api) {
			if (process.env.VERCEL) throw new Error("API_URL is required on Vercel");
			return [];
		}
		if (process.env.VERCEL && !api.startsWith("https://")) {
			throw new Error("API_URL must use HTTPS on Vercel");
		}
		return [{ source: "/api/:path*", destination: `${api}/:path*` }];
	},
	async headers() {
		return [
			{
				source: "/api/:path*",
				headers: [
					{ key: "Cache-Control", value: "private, no-store" },
					{ key: "x-vercel-enable-rewrite-caching", value: "0" },
				],
			},
		];
	},
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
