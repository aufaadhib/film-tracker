import assert from "node:assert/strict";
import auth from "../auth.js";

const state = "a".repeat(43);
const code = "b".repeat(43);
const authUrl = new URL(auth.buildAuthUrl("http://localhost:3000", {
  redirectUri: "https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/reelmark",
  state,
  installId: "3d124dbe-a2c8-4f31-9729-35a683370788",
  deviceName: "Chrome / Edge",
}));

assert.equal(authUrl.pathname, "/auth/extension/connect");
assert.equal(authUrl.searchParams.get("state"), state);
assert.equal(auth.parseAuthCallback(`https://example.chromiumapp.org/reelmark?code=${code}&state=${state}`, state), code);
assert.throws(
  () => auth.parseAuthCallback(`https://example.chromiumapp.org/reelmark?code=${code}&state=wrong`, state),
  /tidak valid/,
);
assert.throws(
  () => auth.parseAuthCallback(`https://example.chromiumapp.org/reelmark?error=denied&state=${state}`, state),
  /belum berhasil/,
);
assert.throws(
  () => auth.parseAuthCallback(`https://example.chromiumapp.org/reelmark?error=extension_not_allowed&state=${state}`, state),
  /belum diizinkan/,
);

console.log("auth tests passed");
