import type { ReactNode } from "react";
import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { BottomDock } from "../components/bottom-dock";
import { TelegramBoot } from "../components/telegram-boot";
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
				<Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
				<ThemeProvider>
					<TelegramBoot />
					<div className="mx-auto min-h-screen max-w-[480px] pb-24">{children}</div>
					<BottomDock />
				</ThemeProvider>
			</body>
		</html>
	);
}
