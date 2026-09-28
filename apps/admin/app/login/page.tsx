"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ThemeToggle } from "../../components/theme-toggle";
import { clientApi } from "../../lib/api";
import { ui } from "../../lib/ui";
import { Button, Card, CardBody } from "../../lib/ui-kit";

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
		<div className="relative grid min-h-screen place-items-center bg-bg px-4">
			<div className="absolute right-5 top-5">
				<ThemeToggle />
			</div>
			<Card className="w-full max-w-[420px]">
				<CardBody>
					<form onSubmit={onSubmit}>
						<div className="mb-1 flex items-center gap-2 text-[28px] font-extrabold tracking-tight text-ink">
							<span className="grid size-8 place-items-center rounded-[10px] bg-primary text-[20px] text-[var(--nav-ink)]">
								c
							</span>
							cinema.
						</div>
						<p className={ui.sub}>Вход в панель управления</p>
						{error ? <p className={ui.err}>{error}</p> : null}
						<div className={ui.field}>
							<label className={ui.label} htmlFor="email">
								Эл. почта
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
						<Button className="w-full" type="submit">
							Войти
						</Button>
					</form>
				</CardBody>
			</Card>
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
