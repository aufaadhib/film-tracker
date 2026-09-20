import assert from "node:assert/strict";
import { extensionCorsHeaders } from "./extension-cors.ts";

const extensionId = "abcdefghijklmnopabcdefghijklmnop";
assert.equal(extensionCorsHeaders(`chrome-extension://${extensionId}`, undefined), null);
assert.equal(extensionCorsHeaders("https://example.com", extensionId), null);
assert.equal(extensionCorsHeaders("chrome-extension://bad", extensionId), null);
assert.deepEqual(extensionCorsHeaders(`chrome-extension://${extensionId}`, `other, ${extensionId}`), {
  "Access-Control-Allow-Origin": `chrome-extension://${extensionId}`,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

console.log("extension CORS tests passed");
