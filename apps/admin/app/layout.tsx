import type { ReactNode } from "react";
import "../lib/ui-kit";
import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "../components/theme-provider";

export const metadata: Metadata = {
	title: "Cinema Admin",
};

const themeBoot = `(function(){try{var t=localStorage.getItem("cinema-theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="ru" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeBoot }} />
			</head>
			<body>
				<ThemeProvider>{children}</ThemeProvider>
			</body>
		</html>
	);
}
