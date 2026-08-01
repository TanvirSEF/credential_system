import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";

let scenario = "create";
const ownerIds = {
  create: "11111111-1111-4111-8111-111111111111",
  existing: "22222222-2222-4222-8222-222222222222",
};

const server = http.createServer(async (request, response) => {
  let body = "";
  for await (const chunk of request) body += chunk;
  const payload = JSON.parse(body);

  assert.equal(request.headers.apikey, scenario === "create" ? "service-key" : request.url?.includes("admin/users") ? "service-key" : "publishable-key");
  assert.equal(payload.email, "owner@example.com");
  assert.equal(payload.password, "strong-password");

  response.setHeader("Content-Type", "application/json");
  if (request.url === "/auth/v1/admin/users" && scenario === "existing") {
    response.statusCode = 422;
    response.end(JSON.stringify({ message: "User already registered" }));
    return;
  }

  if (request.url === "/auth/v1/admin/users") {
    response.end(JSON.stringify({ id: ownerIds.create }));
    return;
  }

  assert.equal(request.url, "/auth/v1/token?grant_type=password");
  response.end(JSON.stringify({ user: { id: ownerIds.existing } }));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert(address && typeof address === "object");

async function runBootstrap() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/bootstrap-owner.mjs"], {
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${address.port}`,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(
      "service-key\nowner@example.com\nstrong-password\nVault Owner\n"
    );
  });
}

const created = await runBootstrap();
assert.equal(created.code, 0, created.stderr);
assert.match(created.stdout, new RegExp(`OWNER_USER_ID=${ownerIds.create}`));
assert.doesNotMatch(created.stdout + created.stderr, /strong-password|service-key/);

scenario = "existing";
const existing = await runBootstrap();
assert.equal(existing.code, 0, existing.stderr);
assert.match(existing.stdout, new RegExp(`OWNER_USER_ID=${ownerIds.existing}`));
assert.match(existing.stderr, /Existing verified Supabase account/);
assert.doesNotMatch(existing.stdout + existing.stderr, /strong-password|service-key/);

await new Promise((resolve, reject) =>
  server.close((error) => (error ? reject(error) : resolve()))
);
console.log("Owner bootstrap tests passed.");
