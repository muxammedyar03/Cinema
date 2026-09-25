import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildDigestJobData,
	cinemaDigestJobOptions,
	cinemaDigestKey,
	DEFAULT_FOLLOW_NOTIFY_DEBOUNCE_MS,
	resolveDebounceMs,
	toBullJobId,
} from "../src/index.js";

describe("follow-digest options (KAN-35)", () => {
	it("uses a deterministic per-cinema key", () => {
		assert.equal(cinemaDigestKey("cin_1"), "notify:cinema:cin_1");
	});

	it("defaults the window to 5 minutes and honours FOLLOW_NOTIFY_DEBOUNCE_MS", () => {
		assert.equal(DEFAULT_FOLLOW_NOTIFY_DEBOUNCE_MS, 300_000);
		assert.equal(resolveDebounceMs(undefined), 300_000);
		assert.equal(resolveDebounceMs(""), 300_000);
		assert.equal(resolveDebounceMs("60000"), 60_000);
		assert.equal(resolveDebounceMs("0"), 0);
		assert.equal(resolveDebounceMs("-5"), 300_000);
		assert.equal(resolveDebounceMs("abc"), 300_000);
	});

	it("builds a delayed, deduplicated job that survives publishes during processing", () => {
		const opts = cinemaDigestJobOptions("cin_1", 300_000);
		assert.equal(opts.delay, 300_000);
		assert.deepEqual(opts.deduplication, { id: "notify:cinema:cin_1", keepLastIfActive: true });
		assert.equal(opts.jobId, undefined);
		assert.equal(opts.attempts, 5);
	});

	it("stamps the window end into job data", () => {
		assert.deepEqual(buildDigestJobData("cin_1", "https://x", 300_000, 1_000), {
			cinemaId: "cin_1",
			deepLink: "https://x",
			windowEndsAt: 301_000,
		});
	});

	it("produces BullMQ-safe job ids", () => {
		assert.equal(
			toBullJobId("notify:afisha.digest:cin_1:123:usr_1"),
			"notify.afisha.digest.cin_1.123.usr_1",
		);
	});
});
