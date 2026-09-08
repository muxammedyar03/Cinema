import type { ReactNode } from "react";
import "./globals.css";
import type { Metadata } from "next";
import { BottomDock } from "../components/bottom-dock";
import { ThemeProvider } from "../components/theme-provider";

export const metadata: Metadata = {
	title: "Cinema",
	description: "Telegram Mini App — каталог кинотеатра",
};

const themeBoot = `(function(){try{var t=localStorage.getItem("cinema-theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="ru" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeBoot }} />
			</head>
			<body>
				<ThemeProvider>
					<div className="mx-auto min-h-screen max-w-[480px] pb-24">{children}</div>
					<BottomDock />
				</ThemeProvider>
			</body>
		</html>
	);
}
