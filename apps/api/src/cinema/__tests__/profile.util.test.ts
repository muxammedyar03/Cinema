import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	isInstagramUrl,
	isProfileComplete,
	missingSteps,
	normalizeInstagramUrl,
	normalizeTelegramContact,
	stepsFromFlags,
} from "../profile.util";

describe("cinema profile util", () => {
	it("accepts instagram.com hosts only", () => {
		assert.equal(isInstagramUrl("https://www.instagram.com/navoiy/"), true);
		assert.equal(isInstagramUrl("https://instagram.com/navoiy"), true);
		assert.equal(isInstagramUrl("https://example.com/navoiy"), false);
	});

	it("normalizes instagram handles to https URLs", () => {
		assert.equal(normalizeInstagramUrl("@navoiy"), "https://www.instagram.com/navoiy/");
		assert.equal(normalizeInstagramUrl("navoiy"), "https://www.instagram.com/navoiy/");
	});

	it("strips t.me links to @username", () => {
		assert.equal(normalizeTelegramContact("https://t.me/navoiy_cinema"), "@navoiy_cinema");
		assert.equal(normalizeTelegramContact("t.me/navoiy_cinema"), "@navoiy_cinema");
		assert.equal(normalizeTelegramContact("@navoiy_cinema"), "@navoiy_cinema");
	});

	it("computes profileComplete from all six flags", () => {
		const incomplete = {
			stepPhotosDone: true,
			stepLocationDone: true,
			stepInstagramDone: true,
			stepPhonesDone: true,
			stepTelegramContactDone: true,
			stepSecurityEmailDone: false,
		};
		assert.equal(isProfileComplete(incomplete), false);
		assert.deepEqual(missingSteps(stepsFromFlags(incomplete)), ["securityEmail"]);
		assert.equal(isProfileComplete({ ...incomplete, stepSecurityEmailDone: true }), true);
	});
});
