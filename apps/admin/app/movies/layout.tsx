import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Shell } from "../../components/shell";
import { assertBillingAccess } from "../../lib/billing-access";
import { roleOf } from "../../lib/rbac";
import { getMe } from "../../lib/server-api";

export default async function MoviesLayout({ children }: { children: ReactNode }) {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) === "super") redirect("/");
	await assertBillingAccess(user);
	return <Shell user={user}>{children}</Shell>;
}
