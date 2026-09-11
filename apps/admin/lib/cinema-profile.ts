import type {
	CinemaAdminProfile,
	CinemaPhotoDto,
	MapProvider,
	ProfileStepKey,
} from "@cinema/types";
import { clientApi } from "./api";

export type { CinemaAdminProfile, CinemaPhotoDto, MapProvider, ProfileStepKey };

export async function fetchCinemaProfile(cinemaId: string) {
	return clientApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/profile`);
}

export async function uploadCinemaPhoto(cinemaId: string, file: File): Promise<CinemaAdminProfile> {
	const signed = await clientApi<{
		uploadUrl: string;
		publicUrl: string;
		headers?: Record<string, string>;
	}>(`/admin/cinemas/${cinemaId}/photos/upload-url`, {
		method: "POST",
		body: JSON.stringify({
			contentType: file.type || "image/jpeg",
			byteSize: file.size,
		}),
	});
	const put = await fetch(signed.uploadUrl, {
		method: "PUT",
		credentials: "include",
		headers: {
			"Content-Type": file.type || "image/jpeg",
			...signed.headers,
		},
		body: file,
	});
	if (!put.ok) {
		throw new Error("Не удалось загрузить файл");
	}
	return clientApi<CinemaAdminProfile>(`/admin/cinemas/${cinemaId}/photos`, {
		method: "POST",
		body: JSON.stringify({ url: signed.publicUrl }),
	});
}
