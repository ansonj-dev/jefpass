import { ZodError } from "zod";
import { suggestDraft } from "../../../lib/ai";
import { ApiError, SESSION_COOKIE, SESSION_SECONDS, boundedJson, login, logout, rateLimit, register, requestOrigin, sessionWorker, validateMutation } from "../../../lib/auth";
import { attachNostrReceipt, getReceipt, verifyReceipt } from "../../../lib/receipt";
import { completeJob, createJob, createReceipt, customerAction, disconnectWallet, emptySchema, exportWorker, getCustomer, invoiceJob, jobsFor, ownedJob, passport, reconcileJob, sanitizeJob, saveWallet, sessionStatus, setVisibility, shareJob, updateProfile } from "../../../lib/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sessionToken(request: Request): string | undefined {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}

function json(body: unknown, status = 200, cookie?: string): Response {
  return Response.json(body, { status, headers: {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
    ...(cookie ? { "Set-Cookie": cookie } : {}),
  } });
}

function cookieFor(request: Request, token: string, clear = false): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${requestOrigin(request).startsWith("https:") ? "; Secure" : ""}`;
}

export async function handleRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
    const method = request.method;
    const token = sessionToken(request);
    const worker = sessionWorker(token);
    rateLimit("global", 2000);
    rateLimit(`caller:${worker?.id ?? "anonymous"}`, worker ? 180 : 300);
    const mutation = method === "POST" || method === "DELETE";
    if (mutation) validateMutation(request);
    if (path[0] === "auth" && method === "POST") rateLimit("authentication", 30);
    const input = method === "POST" || (method === "DELETE" && request.body) ? await boundedJson(request) : {};
    const customerUrl = (shareToken: string) => `${requestOrigin(request)}/confirm/${shareToken}`;
    if (path.length === 1 && path[0] === "session" && method === "GET") return json(sessionStatus(worker));
    if (path.length === 2 && path[0] === "auth" && method === "POST") {
      if (path[1] === "register" || path[1] === "login") {
        const result = path[1] === "register" ? await register(input) : await login(input);
        if (token) logout(token);
        return json({ worker: result.worker }, path[1] === "register" ? 201 : 200, cookieFor(request, result.token));
      }
      if (path[1] === "logout") {
        emptySchema.parse(input);
        logout(token);
        return json({}, 200, cookieFor(request, "", true));
      }
    }
    if (path.length === 2 && path[0] === "customer") {
      if (method === "GET") return json(getCustomer(path[1]));
      if (method === "POST") return json({ job: sanitizeJob(customerAction(path[1], input), "customer") });
    }
    if (path.length === 2 && path[0] === "receipts" && method === "GET") {
      const receipt = getReceipt(path[1]);
      return json({ receipt, verification: verifyReceipt(receipt) });
    }
    if (path.length === 2 && path[0] === "passport" && method === "GET") return json(passport(path[1]));
    if (!worker) throw new ApiError(401, "Authentication required");
    if (path.join("/") === "ai/draft" && method === "POST") {
      rateLimit(`ai:${worker.id}`, 10);
      return json(await suggestDraft(input));
    }
    if (path.length === 1 && path[0] === "jobs") {
      if (method === "GET") return json({ jobs: jobsFor(worker.id).map((job) => sanitizeJob(job)) });
      if (method === "POST") {
        const result = createJob(worker.id, input);
        return json({ job: sanitizeJob(result.job), ...(result.token ? { customerUrl: customerUrl(result.token) } : {}) }, 201);
      }
    }
    if (path[0] === "jobs" && path.length === 2 && method === "GET") return json({ job: sanitizeJob(ownedJob(worker.id, path[1])) });
    if (path[0] === "jobs" && path.length === 3 && method === "POST") {
      const id = path[1];
      if (path[2] === "visibility") return json({ job: sanitizeJob(setVisibility(worker.id, id, input)) });
      emptySchema.parse(input);
      if (path[2] === "share") return json({ customerUrl: customerUrl(shareJob(worker.id, id)) });
      if (path[2] === "complete") return json({ job: sanitizeJob(completeJob(worker.id, id)) });
      if (path[2] === "invoice") return json({ job: sanitizeJob(await invoiceJob(worker.id, id)) });
      if (path[2] === "reconcile") return json({ job: sanitizeJob(await reconcileJob(worker.id, id)) });
      if (path[2] === "receipt") return json({ receipt: createReceipt(worker.id, id) });
    }
    if (path.length === 3 && path[0] === "receipts" && path[2] === "nostr" && method === "POST") {
      return json(attachNostrReceipt(worker, path[1], input));
    }
    if (path.length === 1 && path[0] === "export" && method === "GET") return json(exportWorker(worker));
    if (path.length === 1 && path[0] === "profile" && method === "POST") return json({ worker: updateProfile(worker.id, input) });
    if (path.length === 1 && path[0] === "wallet") {
      if (method === "POST") return json(await saveWallet(worker.id, input));
      if (method === "DELETE") { emptySchema.parse(input); return json(disconnectWallet(worker.id)); }
    }
    throw new ApiError(404, "API endpoint not found");
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    if (error instanceof ZodError) return json({ error: "Invalid request: " + error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") }, 400);
    return json({ error: "Internal server error" }, 500);
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const DELETE = handleRequest;