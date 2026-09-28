import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Shell } from "../../components/shell";
import { getMe } from "../../lib/server-api";

export default async function MobileOpsLayout({ children }: { children: ReactNode }) {
	const user = await getMe();
	if (!user) redirect("/login");
	return (
		<Shell user={user} billingLock={false}>
			{children}
		</Shell>
	);
}
