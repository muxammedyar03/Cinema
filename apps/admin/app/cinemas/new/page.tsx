import { redirect } from "next/navigation";
import { roleOf } from "../../../lib/rbac";
import { getMe } from "../../../lib/server-api";
import { NewClientForm } from "../../clients/new/new-client-form";

export default async function NewCinemaPage() {
	const user = await getMe();
	if (!user) redirect("/login");
	if (roleOf(user) !== "super") redirect("/");
	return <NewClientForm user={user} cancelHref="/cinemas" />;
}
