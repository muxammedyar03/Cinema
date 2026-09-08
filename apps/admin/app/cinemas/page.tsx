import { redirect } from "next/navigation";

/** Legacy list → /clients */
export default function CinemasRedirect() {
	redirect("/clients");
}
