import type { SessionUser } from "@cinema/types";
import { redirect } from "next/navigation";
import { roleOf } from "./rbac";
import { serverApi } from "./server-api";

type Access = { locked: boolean };

/** Cinema staff with LOCKED subscription → /billing/locked */
export async function assertBillingAccess(user: SessionUser) {
	if (roleOf(user) === "super") return;
	const access = await serverApi<Access>("/admin/billing/access");
	if (access.locked) redirect("/billing/locked");
}
