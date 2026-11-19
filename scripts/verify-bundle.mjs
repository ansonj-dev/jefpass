import { createHash, createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decode } from "bolt11";
import { verifyEvent } from "nostr-tools";

// JëfPass application-specific ephemeral event; NIP-98 reserves kind 27235.
const CUSTOMER_PROOF_KIND = 27236;

export function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isSafeInteger(value))) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  throw new Error("Unsupported canonical value");
}
const hash = value => createHash("sha256").update(value).digest("hex");

export function verifyBundle(bundle, trustedIssuer = process.env.TRUSTED_ISSUER_PUBLIC_KEY) {
  if (!Array.isArray(bundle.jobs) || !Array.isArray(bundle.receipts) || !bundle.worker?.id) throw new Error("Expected a private JefPass export");
  const receipts = bundle.receipts.map(receipt => {
    try {
      const { signature, commitment, ...payload } = receipt;
      const serialized = canonical(payload);
      const commitmentValid = hash(serialized) === commitment;
      const signatureValid = receipt.issuer.type === "server" && receipt.issuer.algorithm === "Ed25519" && verify(null, Buffer.from(serialized), createPublicKey({ key: Buffer.from(receipt.issuer.publicKey, "base64"), type: "spki", format: "der" }), Buffer.from(signature, "base64"));
      const job = bundle.jobs.find(item => item.id === receipt.jobId && item.workerId === receipt.workerId);
      const scope = job && { jobId: job.id, workerId: job.workerId, title: job.title, description: job.description, category: job.category, amountSats: job.amountSats, currency: job.currency, dueDate: job.dueDate ?? null };
      const scopeValid = !!scope && hash(canonical(scope)) === receipt.scopeHash && receipt.workerId === bundle.worker.id;
      const acknowledgements = job?.acknowledgements || [];
      const customerSignaturesValid = acknowledgements.every(item => {
        const proof = JSON.parse(item.event.content);
        return verifyEvent(item.event) && item.event.kind === CUSTOMER_PROOF_KIND && proof.jobId === job.id &&
          proof.scopeHash === receipt.scopeHash && proof.action === item.action &&
          (!job.customerPubkey || item.event.pubkey === job.customerPubkey);
      }) && (!job?.acceptedAt || acknowledgements.some(item => item.action === "accept")) &&
        (!receipt.acknowledgedAt || acknowledgements.some(item => item.action === "acknowledge"));
      let paymentEvidence = "NOT_CLAIMED";
      if (receipt.payment.state === "SETTLED") {
        const payment = job?.payment;
        const invoice = decode(payment?.invoice || "");
        const prefix = { regtest: "bcrt", testnet: "tb", signet: "tb", mainnet: "bc" }[receipt.payment.network];
        paymentEvidence = payment?.paymentHash === receipt.payment.paymentHash && invoice.tagsObject.payment_hash === payment.paymentHash &&
          invoice.millisatoshis === String(receipt.amountSats * 1000) && receipt.payment.expectedMsat === receipt.amountSats * 1000 &&
          invoice.network?.bech32 === prefix && /^[a-f0-9]{64}$/.test(payment.preimage || "") &&
          hash(Buffer.from(payment.preimage, "hex")) === payment.paymentHash ? "HASH_AMOUNT_PREIMAGE_MATCH" : "INVALID";
      }
      const attachment = (bundle.nostr || []).find(item => item.receiptId === receipt.id);
      const workerSignatureValid = !attachment || (verifyEvent(attachment.event) && attachment.event.pubkey === (attachment.workerPubkey || bundle.worker.pubkey) &&
        attachment.event.kind === 30078 && attachment.event.content === canonical({ commitment, receiptId: receipt.id }) &&
        JSON.stringify(attachment.event.tags) === JSON.stringify([["d", receipt.id]]));
      return { id: receipt.id, valid: commitmentValid && signatureValid && scopeValid && customerSignaturesValid && workerSignatureValid && paymentEvidence !== "INVALID",
        commitmentValid, signatureValid, scopeValid, customerSignaturesValid, paymentEvidence, workerSignature: attachment ? workerSignatureValid : "NOT_ATTACHED",
        issuerTrusted: trustedIssuer ? receipt.issuer.publicKey === trustedIssuer : "NOT_PINNED" };
    } catch { return { id: receipt.id, valid: false, error: "Invalid receipt or missing private evidence" }; }
  });
  return { valid: receipts.every(receipt => receipt.valid && receipt.issuerTrusted !== false), receipts,
    limits: "Offline cryptographic consistency only. Pin TRUSTED_ISSUER_PUBLIC_KEY independently. No live wallet lookup, legal identity, physical work-quality or fiat-receipt claim." };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error("Usage: npm run verify:bundle -- path/to/private-export.json");
  const bundle = JSON.parse(await readFile(process.argv[2], "utf8"));
  const result = verifyBundle(bundle, process.env.TRUSTED_ISSUER_PUBLIC_KEY);
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}