import { redirect } from "next/navigation";
import { roleOf } from "../../../lib/rbac";
import { getMe } from "../../../lib/server-api";
import { NewClientForm } from "./new-client-form";

export default async function NewClientPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/");
	return <NewClientForm user={user} />;
}
