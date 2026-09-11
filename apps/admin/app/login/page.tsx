"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ThemeToggle } from "../../components/theme-toggle";
import { clientApi } from "../../lib/api";
import { cx, ui } from "../../lib/ui";

function LoginForm() {
	const router = useRouter();
	const params = useSearchParams();
	const [email, setEmail] = useState("super@cinema.local");
	const [password, setPassword] = useState("ChangeMe123!");
	const [error, setError] = useState("");

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		try {
			await clientApi("/auth/login", {
				method: "POST",
				body: JSON.stringify({ email, password }),
			});
			const next = params.get("next");
			router.push(next?.startsWith("/") ? next : "/");
			router.refresh();
		} catch {
			setError("Ошибка входа. Проверьте email и пароль.");
		}
	}

	return (
		<div className="relative grid min-h-screen place-items-center bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,var(--wash)_0%,transparent_55%),var(--color-bg)]">
			<div className="absolute right-5 top-5">
				<ThemeToggle />
			</div>
			<form
				className="w-[380px] rounded-3xl border border-line bg-surface px-7 py-8"
				onSubmit={onSubmit}
			>
				<div className={ui.brand}>Cinema</div>
				<p className={ui.sub}>Админ-панель · cookie-сессия</p>
				{error ? <p className={ui.err}>{error}</p> : null}
				<div className={ui.field}>
					<label className={ui.label} htmlFor="email">
						Email
					</label>
					<input
						id="email"
						className={ui.input}
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</div>
				<div className={ui.field}>
					<label className={ui.label} htmlFor="password">
						Пароль
					</label>
					<input
						id="password"
						className={ui.input}
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				<button className={cx(ui.btn, ui.btnPri, "w-full justify-center")} type="submit">
					Войти
				</button>
			</form>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<div className="grid min-h-screen place-items-center text-sm text-muted">Загрузка…</div>
			}
		>
			<LoginForm />
		</Suspense>
	);
}
