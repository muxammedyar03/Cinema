"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
export function CatalogRefresh() {
	const router = useRouter();
	const path = usePathname();
	useEffect(() => {
		if (!(path === "/" || path.startsWith("/movies/") || path.startsWith("/cinemas/"))) return;
		const refresh = () => {
			if (document.visibilityState === "visible") router.refresh();
		};
		const timer = setInterval(refresh, 3000);
		window.addEventListener("focus", refresh);
		window.addEventListener("pageshow", refresh);
		document.addEventListener("visibilitychange", refresh);
		return () => {
			clearInterval(timer);
			window.removeEventListener("focus", refresh);
			window.removeEventListener("pageshow", refresh);
			document.removeEventListener("visibilitychange", refresh);
		};
	}, [router, path]);
	return null;
}
