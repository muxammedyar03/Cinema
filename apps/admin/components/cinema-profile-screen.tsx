"use client";

import type { CinemaAdminProfile, CinemaSecurityStatus, MapProvider } from "@cinema/types";
import { PageHeader, Wizard, type WizardStep } from "@cinema/ui";
import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clientApi } from "../lib/api";
import { errorText } from "../lib/api-error";
import { uploadCinemaPhoto } from "../lib/cinema-profile";
import { parseMapsPaste } from "../lib/maps";
import { profileMissingLabel } from "../lib/platform/format";
import { cx, ui } from "../lib/ui";
import { CinemaMapEmbed } from "./cinema-map-embed";
import { CreateAction, CreateBanner } from "./create-action";
import fields from "./platform/fields.module.css";

type Draft = {
	address: string;
	lat: string;
	lng: string;
	provider: MapProvider;
	paste: string;
	instagramUrl: string;
	phones: string[];
	telegram: string;
	currentPassword: string;
	newPassword: string;
	email: string;
	token: string;
	preview: string;
};

function draftFrom(profile: CinemaAdminProfile): Draft {
	const phones = profile.phones.length ? profile.phones : profile.phone ? [profile.phone] : [""];
	return {
		address: profile.address ?? "",
		lat: profile.lat != null ? String(profile.lat) : "",
		lng: profile.lng != null ? String(profile.lng) : "",
		provider: profile.mapProvider ?? "yandex",
		paste: "",
		instagramUrl: profile.instagramUrl ?? "",
		phones,
		telegram: profile.telegramContact ?? "",
		currentPassword: "",
		newPassword: "",
		email: "",
		token: "",
		preview: "",
	};
}

function telegramHref(value: string) {
	const text = value.trim();
	if (!text) return "";
	if (/^https?:\/\//i.test(text)) return text;
	return `https://t.me/${text.replace(/^@/, "")}`;
}

export function CinemaProfileScreen({
	cinemaId,
	initial,
}: {
	cinemaId: string;
	initial: CinemaAdminProfile;
}) {
	const router = useRouter();
	const [profile, setProfile] = useState(initial);
	const profileRef = useRef(profile);
	profileRef.current = profile;

	useEffect(() => {
		setProfile(initial);
		profileRef.current = initial;
	}, [initial]);
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<Draft>(() => draftFrom(initial));
	const complete = profile.profileCompletion.profileComplete;
	const missing = profileMissingLabel(profile.profileCompletion.missing);

	function show() {
		setDraft(draftFrom(profileRef.current));
		setOpen(true);
	}

	const steps: WizardStep<Draft>[] = [
		{
			id: "photos",
			title: "Фото",
			subtitle: "Хотя бы одно фото кинотеатра",
			validate: () => (profileRef.current.photos.length > 0 ? null : "Добавьте хотя бы одно фото"),
			body: () => (
				<PhotoFields
					cinemaId={cinemaId}
					profile={profile}
					onChange={(next) => {
						profileRef.current = next;
						setProfile(next);
					}}
				/>
			),
		},
		{
			id: "location",
			title: "Локация",
			subtitle: "Адрес и точка на карте",
			validate: async (data) => {
				const address = data.address.trim();
				const lat = Number(data.lat);
				const lng = Number(data.lng);
				if (!address) return "Укажите адрес";
				if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "Укажите широту и долготу";
				try {
					const next = await clientApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/location`, {
						method: "PATCH",
						body: JSON.stringify({ provider: data.provider, lat, lng, address }),
					});
					profileRef.current = next;
					setProfile(next);
					return null;
				} catch (cause) {
					return errorText(cause, "Не удалось сохранить локацию");
				}
			},
			body: (data, update) => (
				<div className={fields.sectionGrid}>
					<div className={`${fields.span2} flex flex-wrap gap-2`}>
						{(["yandex", "google"] as const).map((provider) => (
							<button
								key={provider}
								type="button"
								className={cx(ui.chip, data.provider === provider && ui.chipOn)}
								onClick={() => update({ provider })}
							>
								{provider === "yandex" ? "Yandex Maps" : "Google Maps"}
							</button>
						))}
					</div>
					<label className={`${fields.field} ${fields.span2}`}>
						<span className={fields.label}>Адрес</span>
						<input
							className={fields.input}
							value={data.address}
							onChange={(event) => update({ address: event.target.value })}
						/>
					</label>
					<label className={fields.field}>
						<span className={fields.label}>Широта</span>
						<input
							className={fields.input}
							value={data.lat}
							onChange={(event) => update({ lat: event.target.value })}
						/>
					</label>
					<label className={fields.field}>
						<span className={fields.label}>Долгота</span>
						<input
							className={fields.input}
							value={data.lng}
							onChange={(event) => update({ lng: event.target.value })}
						/>
					</label>
					<label className={`${fields.field} ${fields.span2}`}>
						<span className={fields.label}>Ссылка Google или Yandex Maps</span>
						<input
							className={fields.input}
							value={data.paste}
							placeholder="https://maps.google.com/..."
							onChange={(event) => {
								const paste = event.target.value;
								const parsed = parseMapsPaste(paste);
								update({
									paste,
									...(parsed ? { lat: String(parsed.lat), lng: String(parsed.lng) } : {}),
									...(/yandex\./i.test(paste) ? { provider: "yandex" as const } : {}),
									...(/google\./i.test(paste) ? { provider: "google" as const } : {}),
								});
							}}
						/>
					</label>
				</div>
			),
		},
		{
			id: "instagram",
			title: "Instagram",
			subtitle: "Ссылка на профиль кинотеатра",
			validate: async (data) => {
				const instagramUrl = data.instagramUrl.trim();
				if (!instagramUrl) return "Укажите ссылку на Instagram";
				try {
					const next = await clientApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/profile`, {
						method: "PATCH",
						body: JSON.stringify({ instagramUrl, markSteps: { instagram: true } }),
					});
					profileRef.current = next;
					setProfile(next);
					return null;
				} catch (cause) {
					return errorText(cause, "Не удалось сохранить Instagram");
				}
			},
			body: (data, update) => (
				<label className={fields.field}>
					<span className={fields.label}>Профиль</span>
					<input
						className={fields.input}
						value={data.instagramUrl}
						placeholder="https://instagram.com/cinema или @cinema"
						onChange={(event) => update({ instagramUrl: event.target.value })}
					/>
				</label>
			),
		},
		{
			id: "contacts",
			title: "Контакты",
			subtitle: "Телефон и Telegram",
			validate: async (data) => {
				const phones = data.phones.map((phone) => phone.trim()).filter(Boolean);
				const telegramContact = data.telegram.trim();
				if (phones.length === 0) return "Укажите хотя бы один телефон";
				if (!telegramContact) return "Укажите Telegram";
				try {
					const next = await clientApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/profile`, {
						method: "PATCH",
						body: JSON.stringify({
							phones,
							telegramContact,
							markSteps: { phones: true, telegramContact: true },
						}),
					});
					profileRef.current = next;
					setProfile(next);
					return null;
				} catch (cause) {
					return errorText(cause, "Не удалось сохранить контакты");
				}
			},
			body: (data, update) => (
				<div className="grid gap-3">
					{data.phones.map((phone, index) => (
						<label key={`${index}-${data.phones.length}`} className={fields.field}>
							<span className={fields.label}>Телефон {index + 1}</span>
							<input
								className={fields.input}
								value={phone}
								placeholder="+998..."
								onChange={(event) =>
									update({
										phones: data.phones.map((item, itemIndex) =>
											itemIndex === index ? event.target.value : item,
										),
									})
								}
							/>
						</label>
					))}
					<button
						type="button"
						className={cx(ui.btn, ui.btnGhost, ui.btnSm, "w-fit")}
						onClick={() => update({ phones: [...data.phones, ""] })}
					>
						Ещё телефон
					</button>
					<label className={fields.field}>
						<span className={fields.label}>Telegram</span>
						<input
							className={fields.input}
							value={data.telegram}
							placeholder="@cinema или https://t.me/cinema"
							onChange={(event) => update({ telegram: event.target.value })}
						/>
					</label>
				</div>
			),
		},
		{
			id: "password",
			title: "Пароль",
			subtitle: "Можно пропустить, если пароль уже задан",
			validate: async (data) => {
				if (!data.currentPassword && !data.newPassword) return null;
				if (!data.currentPassword) return "Укажите текущий пароль";
				if (data.newPassword.length < 8) return "Новый пароль — минимум 8 символов";
				try {
					await clientApi(`/admin/cinemas/${cinemaId}/security/change-password`, {
						method: "POST",
						body: JSON.stringify({
							currentPassword: data.currentPassword,
							newPassword: data.newPassword,
						}),
					});
					return null;
				} catch (cause) {
					return errorText(cause, "Не удалось сменить пароль");
				}
			},
			body: (data, update) => (
				<div className={fields.sectionGrid}>
					<label className={fields.field}>
						<span className={fields.label}>Текущий пароль</span>
						<input
							className={fields.input}
							type="password"
							autoComplete="current-password"
							value={data.currentPassword}
							onChange={(event) => update({ currentPassword: event.target.value })}
						/>
					</label>
					<label className={fields.field}>
						<span className={fields.label}>Новый пароль</span>
						<input
							className={fields.input}
							type="password"
							autoComplete="new-password"
							value={data.newPassword}
							onChange={(event) => update({ newPassword: event.target.value })}
						/>
					</label>
				</div>
			),
		},
		{
			id: "email",
			title: "Почта",
			subtitle: "Подтверждение входа в кабинет",
			validate: async (data) => {
				if (profileRef.current.profileCompletion.steps.securityEmail) return null;
				const email = data.email.trim();
				const token = (data.token || data.preview).trim();
				if (!email) return "Укажите почту";
				if (!token) return "Отправьте код и введите его";
				try {
					await clientApi(`/admin/cinemas/${cinemaId}/security/confirm-email`, {
						method: "POST",
						body: JSON.stringify({ token }),
					});
					const next = await clientApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/profile`);
					profileRef.current = next;
					setProfile(next);
					return next.profileCompletion.steps.securityEmail ? null : "Почта ещё не подтверждена";
				} catch (cause) {
					return errorText(cause, "Не удалось подтвердить почту");
				}
			},
			body: (data, update) => <EmailFields cinemaId={cinemaId} data={data} update={update} />,
		},
	];

	const phones = profile.phones.length ? profile.phones : profile.phone ? [profile.phone] : [];
	const mapProvider = profile.mapProvider;
	const mapLat = profile.lat;
	const mapLng = profile.lng;

	return (
		<>
			<PageHeader
				title="Профиль"
				description={profile.name}
				actions={
					<CreateBanner
						title={complete ? "Изменить профиль" : "Заполните профиль"}
						description={
							complete
								? "Фото, адрес, карта, Instagram и Telegram"
								: missing
									? `Осталось: ${missing}`
									: "Фото, адрес, карта, Instagram и Telegram"
						}
						action={<CreateAction label={complete ? "Изменить" : "Заполнить"} onClick={show} />}
					/>
				}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-1 gap-x-4">
				<section className={ui.card}>
					<div className={ui.cardH}>Фото</div>
					{profile.photos.length === 0 ? (
						<p className="px-[18px] py-8 text-center text-sm text-muted">Фото пока нет</p>
					) : (
						<div className="grid grid-cols-2 gap-2 p-[18px]">
							{profile.photos.map((photo) => (
								<Image
									key={photo.id}
									src={photo.url}
									alt=""
									width={320}
									height={200}
									unoptimized
									className="h-auto w-full rounded-lg object-cover"
								/>
							))}
						</div>
					)}
				</section>
				{/* Instagram and contacts */}
				<div className="grid md:grid-cols-1">
					<section className={ui.card}>
						<div className={ui.cardH}> Instagram</div>
						<p className="px-[18px] py-5 text-sm">
							{profile.instagramUrl ? (
								<a
									className="font-semibold text-orange"
									href={profile.instagramUrl}
									target="_blank"
									rel="noreferrer"
								>
									{profile.instagramUrl}
								</a>
							) : (
								<span className="text-muted">Профиль пока не указан</span>
							)}
						</p>
					</section>
					<section className={ui.card}>
						<div className={ui.cardH}>Telegram и телефоны</div>
						<div className="grid gap-2 px-[18px] py-5 text-sm">
							{profile.telegramContact ? (
								<a
									className="font-semibold text-orange"
									href={telegramHref(profile.telegramContact)}
									target="_blank"
									rel="noreferrer"
								>
									{profile.telegramContact}
								</a>
							) : (
								<span className="text-muted">Telegram пока не указан</span>
							)}
							{phones.length === 0 ? (
								<span className="text-muted">Телефон пока не указан</span>
							) : (
								phones.map((phone) => (
									<span key={phone} className="text-ink">
										{phone}
									</span>
								))
							)}
						</div>
					</section>
				</div>
				{/* Address and location */}
				<section className={ui.card}>
					<div className={ui.cardH}>Адрес и локация</div>
					<div className="grid gap-3 p-[18px]">
						<p className="text-sm text-ink">{profile.address || "Адрес пока не указан"}</p>
						{mapProvider && mapLat != null && mapLng != null ? (
							<CinemaMapEmbed
								provider={mapProvider}
								lat={mapLat}
								lng={mapLng}
								address={profile.address}
							/>
						) : (
							<p className="text-sm text-muted">Точка на карте пока не указана</p>
						)}
					</div>
				</section>
			</div>

			<Wizard
				open={open}
				title={complete ? "Изменить профиль" : "Заполнить профиль"}
				subtitle="Фото, адрес, карта, Instagram и контакты"
				steps={steps}
				data={draft}
				onChange={setDraft}
				onReset={() => setDraft(draftFrom(profileRef.current))}
				onClose={() => setOpen(false)}
				submitLabel="Готово"
				onSubmit={async () => {
					setOpen(false);
					router.refresh();
				}}
			/>
		</>
	);
}

function PhotoFields({
	cinemaId,
	profile,
	onChange,
}: {
	cinemaId: string;
	profile: CinemaAdminProfile;
	onChange: (profile: CinemaAdminProfile) => void;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	async function onFiles(list: FileList | null) {
		if (!list?.length) return;
		setBusy(true);
		setError("");
		try {
			let next = profile;
			for (const file of [...list].slice(0, 12 - profile.photos.length)) {
				next = await uploadCinemaPhoto(cinemaId, file);
			}
			onChange(next);
		} catch (cause) {
			setError(errorText(cause, "Не удалось загрузить фото"));
		} finally {
			setBusy(false);
		}
	}

	async function remove(photoId: string) {
		setBusy(true);
		setError("");
		try {
			onChange(
				await clientApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/photos/${photoId}`, {
					method: "DELETE",
				}),
			);
		} catch (cause) {
			setError(errorText(cause, "Не удалось удалить фото"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="grid gap-3">
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{profile.photos.map((photo) => (
					<div key={photo.id} className="relative overflow-hidden rounded-lg border border-line">
						<Image
							src={photo.url}
							alt=""
							width={240}
							height={160}
							unoptimized
							className="h-24 w-full object-cover"
						/>
						<button
							type="button"
							className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/55 text-white"
							aria-label="Удалить фото"
							disabled={busy}
							onClick={() => void remove(photo.id)}
						>
							<X className="size-3.5" />
						</button>
					</div>
				))}
				{profile.photos.length < 12 ? (
					<label className="grid h-24 cursor-pointer place-items-center rounded-lg border border-dashed border-line-strong text-muted hover:border-orange hover:text-orange">
						<input
							type="file"
							accept="image/jpeg,image/png,image/webp"
							multiple
							className="hidden"
							onChange={(event) => void onFiles(event.target.files)}
						/>
						<span className="flex flex-col items-center gap-1 text-[12px] font-semibold">
							<ImagePlus className="size-5" />
							{busy ? "…" : "Загрузить"}
						</span>
					</label>
				) : null}
			</div>
			{error ? <p className={fields.error}>{error}</p> : null}
		</div>
	);
}

function EmailFields({
	cinemaId,
	data,
	update,
}: {
	cinemaId: string;
	data: Draft;
	update: (patch: Partial<Draft>) => void;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const updateRef = useRef(update);
	updateRef.current = update;

	useEffect(() => {
		let alive = true;
		void clientApi<CinemaSecurityStatus>(`/admin/cinemas/${cinemaId}/security/status`)
			.then((status) => {
				if (alive && status.email) updateRef.current({ email: status.email });
			})
			.catch(() => undefined);
		return () => {
			alive = false;
		};
	}, [cinemaId]);

	async function send() {
		setBusy(true);
		setError("");
		try {
			const res = await clientApi<{ previewToken?: string }>(
				`/admin/cinemas/${cinemaId}/security/link-email`,
				{ method: "POST", body: JSON.stringify({ email: data.email.trim() }) },
			);
			update({ preview: res.previewToken ?? "" });
		} catch (cause) {
			setError(errorText(cause, "Не удалось отправить код"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="grid gap-3">
			<label className={fields.field}>
				<span className={fields.label}>Электронная почта</span>
				<input
					className={fields.input}
					type="email"
					value={data.email}
					onChange={(event) => update({ email: event.target.value })}
				/>
			</label>
			<button
				type="button"
				className={cx(ui.btn, ui.btnGhost, "w-fit")}
				disabled={busy}
				onClick={() => void send()}
			>
				Отправить код
			</button>
			{data.preview ? <p className={ui.hint}>Код: {data.preview}</p> : null}
			<label className={fields.field}>
				<span className={fields.label}>Код подтверждения</span>
				<input
					className={fields.input}
					value={data.token}
					onChange={(event) => update({ token: event.target.value })}
				/>
			</label>
			{error ? <p className={fields.error}>{error}</p> : null}
		</div>
	);
}
