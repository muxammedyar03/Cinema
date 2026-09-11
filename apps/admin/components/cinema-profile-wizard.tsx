"use client";

import type { CinemaSecurityStatus, MapProvider, SessionUser } from "@cinema/types";
import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clientApi } from "../lib/api";
import { errorText } from "../lib/api-error";
import type { CinemaAdminProfile } from "../lib/cinema-profile";
import { uploadCinemaPhoto } from "../lib/cinema-profile";
import { parseMapsPaste } from "../lib/maps";
import { cx, ui } from "../lib/ui";
import { CinemaMapEmbed } from "./cinema-map-embed";

const STEPS = [
	{ id: "photos", label: "Фото" },
	{ id: "location", label: "Локация" },
	{ id: "instagram", label: "Instagram" },
	{ id: "contacts", label: "Контакты" },
	{ id: "password", label: "Пароль" },
	{ id: "email", label: "Email" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function firstIncompleteStep(profile: CinemaAdminProfile): StepId {
	const s = profile.profileCompletion.steps;
	if (!s.photos) return "photos";
	if (!s.location) return "location";
	if (!s.instagram) return "instagram";
	if (!s.phones || !s.telegramContact) return "contacts";
	if (!s.securityEmail) return "email";
	return "photos";
}

export function CinemaProfileWizard({
	user,
	cinemaId,
	initial,
	backHref,
	backLabel,
	doneHref,
}: {
	user: SessionUser;
	cinemaId: string;
	initial: CinemaAdminProfile;
	backHref: string;
	backLabel: string;
	doneHref: string;
}) {
	const router = useRouter();
	const [profile, setProfile] = useState(initial);
	const [step, setStep] = useState<StepId>(firstIncompleteStep(initial));
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [passwordDone, setPasswordDone] = useState(false);

	const stepIndex = STEPS.findIndex((s) => s.id === step);
	const complete = profile.profileCompletion.profileComplete;

	async function run(fn: () => Promise<void>) {
		setBusy(true);
		setError("");
		try {
			await fn();
		} catch (err) {
			setError(errorText(err, "Не удалось сохранить"));
		} finally {
			setBusy(false);
		}
	}

	function goNext() {
		const next = STEPS[stepIndex + 1];
		if (next) {
			setStep(next.id);
			return;
		}
		if (complete) {
			router.push(doneHref);
			router.refresh();
			return;
		}
		const left = profile.profileCompletion.missing.join(", ");
		setError(left ? `Сначала закройте шаги: ${left}` : "Профиль ещё не заполнен");
	}

	function goPrev() {
		const prev = STEPS[stepIndex - 1];
		if (prev) setStep(prev.id);
	}

	return (
		<div className="max-w-3xl">
			<div className={ui.row}>
				<div>
					<h1 className={ui.pageTitle}>Профиль кинотеатра</h1>
					<p className={ui.sub}>
						{profile.name}
						{complete
							? " · профиль заполнен"
							: ` · осталось: ${profile.profileCompletion.missing.length} шагов`}
					</p>
				</div>
				<Link className={cx(ui.btn, ui.btnGhost)} href={backHref}>
					{backLabel}
				</Link>
			</div>

			<ol className="mb-5 flex flex-wrap gap-2">
				{STEPS.map((item, i) => {
					const done =
						item.id === "password"
							? passwordDone
							: item.id === "contacts"
								? profile.profileCompletion.steps.phones &&
									profile.profileCompletion.steps.telegramContact
								: item.id === "email"
									? profile.profileCompletion.steps.securityEmail
									: profile.profileCompletion.steps[item.id];
					const on = item.id === step;
					return (
						<li key={item.id}>
							<button
								type="button"
								className={cx(
									"inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold",
									on
										? "border-orange bg-orange text-[#171310]"
										: done
											? "border-ok/40 bg-ok/10 text-ok"
											: "border-line-strong text-muted",
								)}
								onClick={() => setStep(item.id)}
							>
								<span>{i + 1}.</span>
								{item.label}
							</button>
						</li>
					);
				})}
			</ol>

			{error ? <p className={ui.err}>{error}</p> : null}

			{step === "photos" ? (
				<PhotosStep
					profile={profile}
					busy={busy}
					cinemaId={cinemaId}
					onChange={setProfile}
					run={run}
				/>
			) : null}
			{step === "location" ? (
				<LocationStep
					profile={profile}
					busy={busy}
					cinemaId={cinemaId}
					onChange={setProfile}
					run={run}
				/>
			) : null}
			{step === "instagram" ? (
				<InstagramStep
					profile={profile}
					busy={busy}
					cinemaId={cinemaId}
					onChange={setProfile}
					run={run}
				/>
			) : null}
			{step === "contacts" ? (
				<ContactsStep
					profile={profile}
					busy={busy}
					cinemaId={cinemaId}
					onChange={setProfile}
					run={run}
				/>
			) : null}
			{step === "password" ? (
				<PasswordStep
					busy={busy}
					cinemaId={cinemaId}
					email={user.email}
					run={run}
					onSkip={() => {
						setPasswordDone(true);
						goNext();
					}}
					onSaved={() => {
						setPasswordDone(true);
						goNext();
					}}
				/>
			) : null}
			{step === "email" ? (
				<EmailStep
					busy={busy}
					cinemaId={cinemaId}
					run={run}
					onVerified={async () => {
						const next = await clientApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/profile`);
						setProfile(next);
					}}
				/>
			) : null}

			<div className="mt-4 flex flex-wrap gap-2">
				{stepIndex > 0 ? (
					<button
						type="button"
						className={cx(ui.btn, ui.btnGhost)}
						onClick={goPrev}
						disabled={busy}
					>
						Назад
					</button>
				) : null}
				{step !== "password" ? (
					<button type="button" className={cx(ui.btn, ui.btnPri)} disabled={busy} onClick={goNext}>
						{stepIndex === STEPS.length - 1 ? "Готово" : "Далее"}
					</button>
				) : null}
			</div>
		</div>
	);
}

function PhotosStep({
	profile,
	busy,
	cinemaId,
	onChange,
	run,
}: {
	profile: CinemaAdminProfile;
	busy: boolean;
	cinemaId: string;
	onChange: (p: CinemaAdminProfile) => void;
	run: (fn: () => Promise<void>) => Promise<void>;
}) {
	async function onFiles(files: FileList | null) {
		if (!files?.length) return;
		await run(async () => {
			let next = profile;
			for (const file of [...files].slice(0, 12 - profile.photos.length)) {
				next = await uploadCinemaPhoto(cinemaId, file);
			}
			onChange(next);
		});
	}

	async function remove(photoId: string) {
		await run(async () => {
			onChange(
				await clientApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/photos/${photoId}`, {
					method: "DELETE",
				}),
			);
		});
	}

	return (
		<section className={ui.card}>
			<div className={ui.cardH}>1. Фотографии · до 12, JPEG/PNG/WebP</div>
			<div className="grid gap-3 p-[18px]">
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
					{profile.photos.map((photo) => (
						<div key={photo.id} className="relative overflow-hidden rounded-lg border border-line">
							<Image
								src={photo.url}
								alt=""
								width={240}
								height={160}
								unoptimized
								className="h-28 w-full object-cover"
							/>
							<button
								type="button"
								className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/55 text-white"
								onClick={() => void remove(photo.id)}
								disabled={busy}
								aria-label="Удалить фото"
							>
								<X className="size-3.5" />
							</button>
						</div>
					))}
					{profile.photos.length < 12 ? (
						<label className="grid h-28 cursor-pointer place-items-center rounded-lg border border-dashed border-line-strong text-muted hover:border-orange hover:text-orange">
							<input
								type="file"
								accept="image/jpeg,image/png,image/webp"
								multiple
								className="hidden"
								onChange={(e) => void onFiles(e.target.files)}
							/>
							<span className="flex flex-col items-center gap-1 text-[12px] font-semibold">
								<ImagePlus className="size-5" />
								Загрузить
							</span>
						</label>
					) : null}
				</div>
				<p className={ui.hint}>Нужно хотя бы одно фото, чтобы закрыть шаг.</p>
			</div>
		</section>
	);
}

function LocationStep({
	profile,
	busy,
	cinemaId,
	onChange,
	run,
}: {
	profile: CinemaAdminProfile;
	busy: boolean;
	cinemaId: string;
	onChange: (p: CinemaAdminProfile) => void;
	run: (fn: () => Promise<void>) => Promise<void>;
}) {
	const [provider, setProvider] = useState<MapProvider>(profile.mapProvider ?? "yandex");
	const [address, setAddress] = useState(profile.address ?? "");
	const [lat, setLat] = useState(profile.lat != null ? String(profile.lat) : "41.311151");
	const [lng, setLng] = useState(profile.lng != null ? String(profile.lng) : "69.279737");
	const [paste, setPaste] = useState("");

	const latN = Number(lat);
	const lngN = Number(lng);
	const preview = Number.isFinite(latN) && Number.isFinite(lngN);

	async function save() {
		await run(async () => {
			onChange(
				await clientApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/location`, {
					method: "PATCH",
					body: JSON.stringify({
						provider,
						lat: latN,
						lng: lngN,
						address: address.trim(),
					}),
				}),
			);
		});
	}

	function applyPaste() {
		const parsed = parseMapsPaste(paste);
		if (!parsed) return;
		setLat(String(parsed.lat));
		setLng(String(parsed.lng));
		if (/yandex\./i.test(paste)) setProvider("yandex");
		if (/google\./i.test(paste)) setProvider("google");
	}

	return (
		<section className={ui.card}>
			<div className={ui.cardH}>2. Локация · Google Maps или Yandex Maps</div>
			<div className="grid gap-3.5 p-[18px]">
				<div className="flex flex-wrap gap-2">
					{(["yandex", "google"] as const).map((p) => (
						<button
							key={p}
							type="button"
							className={cx(ui.chip, provider === p && ui.chipOn)}
							onClick={() => setProvider(p)}
						>
							{p === "yandex" ? "Yandex Maps" : "Google Maps"}
						</button>
					))}
				</div>
				<div className={ui.field}>
					<label className={ui.label} htmlFor="wiz-address">
						Адрес *
					</label>
					<input
						id="wiz-address"
						className={ui.input}
						value={address}
						onChange={(e) => setAddress(e.target.value)}
					/>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className={ui.field}>
						<label className={ui.label} htmlFor="wiz-lat">
							Широта
						</label>
						<input
							id="wiz-lat"
							className={ui.input}
							value={lat}
							onChange={(e) => setLat(e.target.value)}
						/>
					</div>
					<div className={ui.field}>
						<label className={ui.label} htmlFor="wiz-lng">
							Долгота
						</label>
						<input
							id="wiz-lng"
							className={ui.input}
							value={lng}
							onChange={(e) => setLng(e.target.value)}
						/>
					</div>
				</div>
				<div className={ui.field}>
					<label className={ui.label} htmlFor="wiz-paste">
						Вставить ссылку Google/Yandex Maps
					</label>
					<div className="flex gap-2">
						<input
							id="wiz-paste"
							className={ui.input}
							value={paste}
							onChange={(e) => setPaste(e.target.value)}
							placeholder="https://maps.google.com/..."
						/>
						<button type="button" className={cx(ui.btn, ui.btnGhost)} onClick={applyPaste}>
							Разобрать
						</button>
					</div>
				</div>
				{preview ? (
					<CinemaMapEmbed provider={provider} lat={latN} lng={lngN} address={address} />
				) : null}
				<button
					type="button"
					className={cx(ui.btn, ui.btnPri)}
					disabled={busy}
					onClick={() => void save()}
				>
					{busy ? "…" : "Сохранить локацию"}
				</button>
			</div>
		</section>
	);
}

function InstagramStep({
	profile,
	busy,
	cinemaId,
	onChange,
	run,
}: {
	profile: CinemaAdminProfile;
	busy: boolean;
	cinemaId: string;
	onChange: (p: CinemaAdminProfile) => void;
	run: (fn: () => Promise<void>) => Promise<void>;
}) {
	const [url, setUrl] = useState(profile.instagramUrl ?? "");

	async function save() {
		await run(async () => {
			onChange(
				await clientApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/profile`, {
					method: "PATCH",
					body: JSON.stringify({ instagramUrl: url.trim(), markSteps: { instagram: true } }),
				}),
			);
		});
	}

	return (
		<section className={ui.card}>
			<div className={ui.cardH}>3. Instagram</div>
			<div className="grid gap-3.5 p-[18px]">
				<div className={ui.field}>
					<label className={ui.label} htmlFor="wiz-ig">
						Ссылка на профиль *
					</label>
					<input
						id="wiz-ig"
						className={ui.input}
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						placeholder="https://instagram.com/cinema или @cinema"
					/>
				</div>
				<button
					type="button"
					className={cx(ui.btn, ui.btnPri)}
					disabled={busy}
					onClick={() => void save()}
				>
					{busy ? "…" : "Сохранить Instagram"}
				</button>
			</div>
		</section>
	);
}

function ContactsStep({
	profile,
	busy,
	cinemaId,
	onChange,
	run,
}: {
	profile: CinemaAdminProfile;
	busy: boolean;
	cinemaId: string;
	onChange: (p: CinemaAdminProfile) => void;
	run: (fn: () => Promise<void>) => Promise<void>;
}) {
	const initialPhones = useMemo(() => {
		const values = profile.phones.length ? profile.phones : profile.phone ? [profile.phone] : [""];
		return values.map((value, index) => ({ id: `phone-${index}-${value}`, value }));
	}, [profile.phone, profile.phones]);
	const [phones, setPhones] = useState(initialPhones);
	const [telegram, setTelegram] = useState(profile.telegramContact ?? "");

	async function save() {
		const cleaned = phones.map((p) => p.value.trim()).filter(Boolean);
		await run(async () => {
			onChange(
				await clientApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/profile`, {
					method: "PATCH",
					body: JSON.stringify({
						phones: cleaned,
						telegramContact: telegram.trim(),
						markSteps: { phones: true, telegramContact: true },
					}),
				}),
			);
		});
	}

	return (
		<section className={ui.card}>
			<div className={ui.cardH}>4. Телефон и Telegram</div>
			<div className="grid gap-3.5 p-[18px]">
				{phones.map((phone, i) => (
					<div key={phone.id} className={ui.field}>
						<label className={ui.label} htmlFor={`wiz-phone-${phone.id}`}>
							Телефон {i === 0 ? "*" : i + 1}
						</label>
						<div className="flex gap-2">
							<input
								id={`wiz-phone-${phone.id}`}
								className={ui.input}
								value={phone.value}
								onChange={(e) =>
									setPhones((rows) =>
										rows.map((row) =>
											row.id === phone.id ? { ...row, value: e.target.value } : row,
										),
									)
								}
								placeholder="+998..."
							/>
							{phones.length > 1 ? (
								<button
									type="button"
									className={cx(ui.btn, ui.btnGhost, ui.btnSm)}
									onClick={() => setPhones((rows) => rows.filter((row) => row.id !== phone.id))}
								>
									×
								</button>
							) : null}
						</div>
					</div>
				))}
				<button
					type="button"
					className={cx(ui.btn, ui.btnGhost, ui.btnSm, "w-fit")}
					onClick={() =>
						setPhones((rows) => [...rows, { id: `phone-${crypto.randomUUID()}`, value: "" }])
					}
				>
					Ещё телефон
				</button>
				<div className={ui.field}>
					<label className={ui.label} htmlFor="wiz-tg">
						Telegram контакт *
					</label>
					<input
						id="wiz-tg"
						className={ui.input}
						value={telegram}
						onChange={(e) => setTelegram(e.target.value)}
						placeholder="@cinema или https://t.me/cinema"
					/>
				</div>
				<button
					type="button"
					className={cx(ui.btn, ui.btnPri)}
					disabled={busy}
					onClick={() => void save()}
				>
					{busy ? "…" : "Сохранить контакты"}
				</button>
			</div>
		</section>
	);
}

function PasswordStep({
	busy,
	cinemaId,
	email,
	run,
	onSkip,
	onSaved,
}: {
	busy: boolean;
	cinemaId: string;
	email: string | null;
	run: (fn: () => Promise<void>) => Promise<void>;
	onSkip: () => void;
	onSaved: () => void;
}) {
	const [currentPassword, setCurrent] = useState("");
	const [newPassword, setNew] = useState("");

	async function save() {
		await run(async () => {
			await clientApi(`/admin/cinemas/${cinemaId}/security/change-password`, {
				method: "POST",
				body: JSON.stringify({ currentPassword, newPassword }),
			});
			onSaved();
		});
	}

	return (
		<section className={ui.card}>
			<div className={ui.cardH}>5. Смена пароля</div>
			<div className="grid gap-3.5 p-[18px]">
				<p className="text-[13px] text-muted">
					Аккаунт {email ?? "текущего пользователя"}. Шаг не входит в profileComplete — можно
					пропустить, если пароль уже задан при создании.
				</p>
				<div className={ui.field}>
					<label className={ui.label} htmlFor="wiz-cur">
						Текущий пароль
					</label>
					<input
						id="wiz-cur"
						type="password"
						className={ui.input}
						value={currentPassword}
						onChange={(e) => setCurrent(e.target.value)}
					/>
				</div>
				<div className={ui.field}>
					<label className={ui.label} htmlFor="wiz-new">
						Новый пароль (мин. 8)
					</label>
					<input
						id="wiz-new"
						type="password"
						className={ui.input}
						minLength={8}
						value={newPassword}
						onChange={(e) => setNew(e.target.value)}
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						className={cx(ui.btn, ui.btnPri)}
						disabled={busy}
						onClick={() => void save()}
					>
						Сменить пароль
					</button>
					<button
						type="button"
						className={cx(ui.btn, ui.btnGhost)}
						disabled={busy}
						onClick={onSkip}
					>
						Пропустить
					</button>
				</div>
			</div>
		</section>
	);
}

function EmailStep({
	busy,
	cinemaId,
	run,
	onVerified,
}: {
	busy: boolean;
	cinemaId: string;
	run: (fn: () => Promise<void>) => Promise<void>;
	onVerified: () => Promise<void>;
}) {
	const [status, setStatus] = useState<CinemaSecurityStatus | null>(null);
	const [email, setEmail] = useState("");
	const [token, setToken] = useState("");
	const [preview, setPreview] = useState("");

	useEffect(() => {
		void clientApi<CinemaSecurityStatus>(`/admin/cinemas/${cinemaId}/security/status`)
			.then((next) => {
				setStatus(next);
				setEmail(next.email ?? "");
			})
			.catch(() => {
				/* status loads on send */
			});
	}, [cinemaId]);

	async function load() {
		const next = await clientApi<CinemaSecurityStatus>(
			`/admin/cinemas/${cinemaId}/security/status`,
		);
		setStatus(next);
		setEmail(next.email ?? "");
	}

	async function send() {
		await run(async () => {
			const res = await clientApi<{ email: string; previewToken?: string }>(
				`/admin/cinemas/${cinemaId}/security/link-email`,
				{ method: "POST", body: JSON.stringify({ email: email.trim() }) },
			);
			setPreview(res.previewToken ?? "");
			await load();
		});
	}

	async function confirm() {
		await run(async () => {
			await clientApi(`/admin/cinemas/${cinemaId}/security/confirm-email`, {
				method: "POST",
				body: JSON.stringify({ token: token.trim() || preview }),
			});
			await load();
			await onVerified();
		});
	}

	const cinemaStepDone = Boolean(status?.stepSecurityEmailDone);
	const accountVerified = Boolean(status?.emailVerified);

	return (
		<section className={ui.card}>
			<div className={ui.cardH}>6. Email для безопасности</div>
			<div className="grid gap-3.5 p-[18px]">
				{cinemaStepDone ? (
					<p className={ui.okMsg}>Email {status?.email} подтверждён.</p>
				) : accountVerified ? (
					<p className="text-[13px] text-muted">
						Email {status?.email} уже подтверждён на аккаунте — привяжите его к этому кинотеатру.
					</p>
				) : (
					<p className="text-[13px] text-muted">
						Привяжите и подтвердите email текущего аккаунта. Для MVP код показывается здесь (без
						SMTP).
					</p>
				)}
				<div className={ui.field}>
					<label className={ui.label} htmlFor="wiz-em">
						Email *
					</label>
					<input
						id="wiz-em"
						type="email"
						className={ui.input}
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
				</div>
				<button
					type="button"
					className={cx(ui.btn, ui.btnGhost)}
					disabled={busy}
					onClick={() => void send()}
				>
					Отправить код
				</button>
				{preview ? <p className={ui.hint}>Код (dev): {preview}</p> : null}
				<div className={ui.field}>
					<label className={ui.label} htmlFor="wiz-tok">
						Код подтверждения
					</label>
					<input
						id="wiz-tok"
						className={ui.input}
						value={token}
						onChange={(e) => setToken(e.target.value)}
					/>
				</div>
				<button
					type="button"
					className={cx(ui.btn, ui.btnPri)}
					disabled={busy || cinemaStepDone}
					onClick={() => void confirm()}
				>
					{accountVerified && !cinemaStepDone ? "Привязать к кинотеатру" : "Подтвердить email"}
				</button>
			</div>
		</section>
	);
}
