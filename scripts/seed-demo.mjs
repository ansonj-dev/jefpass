import { readFile } from "node:fs/promises";

const origin = new URL(process.env.DEMO_ORIGIN || "http://localhost:3100").origin;
const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;
if (!email || !password) throw new Error("Set DEMO_EMAIL and DEMO_PASSWORD locally for an existing dedicated demo account. Do not commit credentials.");
const headers = { "Content-Type": "application/json", "X-Jefpass": "1", Origin: origin };
const login = await fetch(`${origin}/api/auth/login`, { method: "POST", headers, body: JSON.stringify({ email, password }) });
if (!login.ok) throw new Error("Demo account login failed; register the dedicated account in the app first.");
const cookie = login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
const jobs = JSON.parse(await readFile(new URL("../fixtures/demo-jobs.json", import.meta.url), "utf8"));
for (const job of jobs) {
  const response = await fetch(`${origin}/api/jobs`, { method: "POST", headers: { ...headers, Cookie: cookie }, body: JSON.stringify(job) });
  if (!response.ok) throw new Error(`Demo quote creation failed (${response.status}). No payment was attempted.`);
  const result = await response.json();
  console.log(`Demo quote ready: ${result.job.id} / ${result.job.state} / ${result.job.payment?.state || "NOT_REQUESTED"}`);
}
console.log("Only sample quotes were seeded. Customer acknowledgements and payments were not generated.");