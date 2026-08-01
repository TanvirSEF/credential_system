async function readLines() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input.replace(/\r/g, "").split("\n");
}

function fail(message) {
  console.error(`Owner bootstrap failed: ${message}`);
  process.exit(1);
}

const [serviceRoleKey, emailInput, password, fullNameInput] = await readLines();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const email = emailInput?.trim().toLowerCase();
const fullName = fullNameInput?.trim() || "Instance Owner";

if (!supabaseUrl || !publishableKey) fail("Supabase URL or publishable key is missing.");
if (!serviceRoleKey?.trim()) fail("A Supabase service-role key is required.");
if (!email || !/^\S+@\S+\.\S+$/.test(email)) fail("Enter a valid owner email address.");
if (!password || password.length < 8) fail("The account password must have at least 8 characters.");

async function postAuth(path, apiKey, payload) {
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

const created = await postAuth("admin/users", serviceRoleKey.trim(), {
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

let ownerId = created.data?.user?.id || created.data?.id;

if (!ownerId) {
  const signedIn = await postAuth(
    "token?grant_type=password",
    publishableKey,
    { email, password }
  );

  if (!signedIn.response.ok || !signedIn.data?.user?.id) {
    fail(
      created.data?.message ||
        created.data?.msg ||
        "This email already exists, but the supplied password could not verify it."
    );
  }
  ownerId = signedIn.data.user.id;
  console.error("Existing verified Supabase account selected as instance owner.");
}

console.log(`OWNER_USER_ID=${ownerId}`);
