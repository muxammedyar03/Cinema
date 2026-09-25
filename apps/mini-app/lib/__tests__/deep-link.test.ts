import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStartParam, pickStartParam, resolveDeepLink } from "../deep-link";

describe("parseStartParam", () => {
	it("maps afisha to the home listing", () => {
		assert.deepEqual(parseStartParam("afisha"), { kind: "afisha", href: "/" });
		assert.deepEqual(parseStartParam("  afisha  "), { kind: "afisha", href: "/" });
	});

	it("maps tickets to my tickets", () => {
		assert.deepEqual(parseStartParam("tickets"), { kind: "tickets", href: "/orders" });
	});

	it("maps cinema_{id} to the cinema page", () => {
		assert.deepEqual(parseStartParam("cinema_seed-magic-cinema"), {
			kind: "cinema",
			id: "seed-magic-cinema",
			href: "/cinemas/seed-magic-cinema",
		});
		assert.deepEqual(parseStartParam("cinema_cin_1"), {
			kind: "cinema",
			id: "cin_1",
			href: "/cinemas/cin_1",
		});
	});

	it("maps session_{id} to the session page", () => {
		assert.deepEqual(parseStartParam("session_cm123abc"), {
			kind: "session",
			id: "cm123abc",
			href: "/sessions/cm123abc",
		});
	});

	it("returns null for unknown values", () => {
		assert.equal(parseStartParam("help"), null);
		assert.equal(parseStartParam("movie_1"), null);
		assert.equal(parseStartParam("AFISHA"), null);
		assert.equal(parseStartParam("tickets_extra"), null);
		assert.equal(parseStartParam("cinema"), null);
		assert.equal(parseStartParam("session"), null);
	});

	it("returns null for empty values", () => {
		assert.equal(parseStartParam(""), null);
		assert.equal(parseStartParam("   "), null);
		assert.equal(parseStartParam(null), null);
		assert.equal(parseStartParam(undefined), null);
	});

	it("returns null for a bad id", () => {
		assert.equal(parseStartParam("cinema_"), null);
		assert.equal(parseStartParam("session_"), null);
		assert.equal(parseStartParam("cinema_-bad"), null);
		assert.equal(parseStartParam("cinema_a/b"), null);
		assert.equal(parseStartParam("session_has space"), null);
		assert.equal(parseStartParam("cinema_.."), null);
		assert.equal(parseStartParam("session_id?x"), null);
		assert.equal(parseStartParam(`cinema_${"a".repeat(58)}`), null);
	});
});

describe("pickStartParam", () => {
	it("prefers initData start_param over the URL", () => {
		assert.equal(
			pickStartParam({
				initDataStartParam: "session_abc",
				startapp: "cinema_xyz",
				tgWebAppStartParam: "tickets",
				search: "?startapp=afisha",
				hash: "#tgWebAppStartParam=tickets",
			}),
			"session_abc",
		);
	});

	it("falls back to startapp when initData is empty", () => {
		assert.equal(
			pickStartParam({
				initDataStartParam: "  ",
				startapp: "afisha",
				tgWebAppStartParam: "tickets",
			}),
			"afisha",
		);
	});

	it("falls back to tgWebAppStartParam when startapp is empty", () => {
		assert.equal(
			pickStartParam({
				initDataStartParam: "",
				startapp: null,
				tgWebAppStartParam: "tickets",
			}),
			"tickets",
		);
	});

	it("reads startapp from the query string", () => {
		assert.equal(
			pickStartParam({ search: "?utm=bot&startapp=cinema_seed-magic-cinema" }),
			"cinema_seed-magic-cinema",
		);
	});

	it("reads tgWebAppStartParam from the hash when startapp is absent", () => {
		assert.equal(
			pickStartParam({
				hash: "#tgWebAppData=query_id%3DAA%26user%3D%257B%257D&tgWebAppStartParam=session_cm123abc&tgWebAppVersion=8.0",
			}),
			"session_cm123abc",
		);
	});

	it("prefers query startapp over hash tgWebAppStartParam", () => {
		assert.equal(
			pickStartParam({
				search: "?startapp=tickets",
				hash: "#tgWebAppStartParam=afisha",
			}),
			"tickets",
		);
	});

	it("returns null when every source is empty", () => {
		assert.equal(pickStartParam({}), null);
		assert.equal(pickStartParam({ initDataStartParam: "", search: "?startapp=", hash: "#" }), null);
	});
});

describe("resolveDeepLink", () => {
	it("uses initData when it is set, and does not fall through on an unknown value", () => {
		assert.deepEqual(
			resolveDeepLink({
				initDataStartParam: "cinema_cin_1",
				search: "?startapp=tickets",
			}),
			{ kind: "cinema", id: "cin_1", href: "/cinemas/cin_1" },
		);
		assert.equal(
			resolveDeepLink({
				initDataStartParam: "nope",
				search: "?startapp=tickets",
			}),
			null,
		);
	});

	it("uses the plain https startapp query when initData is missing", () => {
		assert.deepEqual(resolveDeepLink({ search: "?startapp=session_abc_def" }), {
			kind: "session",
			id: "abc_def",
			href: "/sessions/abc_def",
		});
		assert.deepEqual(resolveDeepLink({ search: "?startapp=session_abc%5Fdef" }), {
			kind: "session",
			id: "abc_def",
			href: "/sessions/abc_def",
		});
	});

	it("uses tgWebAppStartParam only after startapp is empty", () => {
		assert.deepEqual(
			resolveDeepLink({
				initDataStartParam: null,
				search: "?startapp=",
				hash: "#tgWebAppStartParam=afisha",
			}),
			{ kind: "afisha", href: "/" },
		);
	});

	it("stays on home for a malformed id in the URL", () => {
		assert.equal(resolveDeepLink({ search: "?startapp=cinema_" }), null);
		assert.equal(resolveDeepLink({ hash: "#tgWebAppStartParam=session_a%2Fb" }), null);
	});
});
