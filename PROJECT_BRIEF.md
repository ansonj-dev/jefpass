# Project Brief

## Product Hypothesis

Independent phone, laptop, and small-appliance repair technicians in Dakar may need a portable record of agreed work, customer acknowledgement, and payment evidence. The first workflow is one technician and one customer, not a marketplace, merchant POS, public reputation score, or lending product.

The hypothesis has not been validated through interviews. Labour-market statistics in the [original idea](dakar_bitcoin_hack_2026_project_idea_jefpass.md) describe context, not demonstrated demand, adoption, or reachable customers. Interviews and a supervised pilot remain next steps; no invented market estimate or testimonial.

## Implemented Workflow

1. Worker signs in and creates a repair quote in sats; any XOF text is a display note, not a verified exchange rate.
2. Customer opens an expiring capability link and signs the exact quote with a browser-generated one-time Nostr key. No customer account required.
3. Worker records completion; customer signs receipt or requests correction. Service and payment states remain separate.
4. Worker explicitly requests an invoice from their receive-only connected wallet. Customer pays from an external wallet on the same network.
5. Server reconciles that invoice and requires exact amount/hash and matching preimage before marking settlement. A server-issued Ed25519 receipt snapshots completed service independently of payment, including an unpaid state when appropriate. Authorized private export includes evidence; public receipts omit invoice/preimage. Optional NIP-07 publication sends only a minimal commitment, not the full dossier.

The EN/FR interface, profiles, workbench, job lifecycle, customer links, signed actions, encrypted NWC adapters, receipts, public passport, and optional Nostr controls are implemented. Customer links expire after seven days; action nonces after five minutes. Accept/acknowledge/dispute signatures use sessionStorage browser keys scoped by job.id, not verified identities.

IndexedDB stores worker-scoped drafts and queued nonfinancial creation with stable clientId and backend scoped deduplication. There is no service-worker offline app shell or guaranteed offline reload; the manifest is an install hint. Optional photos are deferred with no upload endpoint. Authenticated `/api/ai/draft` implements strict title/description/category output and a local fallback without provider calls when `OPENAI_API_KEY` is unset; default model is `gpt-4.1-mini`. No paid calls have been made; voice and Wolof support are not implemented.

## Evidence Labels

Agreement, service acknowledgement, and payment evidence are different layers. `QUOTED`, `ACCEPTED`, `COMPLETED`, `ACKNOWLEDGED`, and `DISPUTED` describe service, not payment. Implemented payment states include `NOT_REQUESTED`, `INVOICE_CREATED`, `PENDING`, `UNKNOWN`, `SETTLED`, `EXPIRED`, `FAILED`, `CANCELLED`, `UNDERPAID`, and `OVERPAID`. Creation is reserved durably before network I/O; ambiguity must not create replacement invoices. Accepted hold invoices remain `PENDING` after local expiry until wallet terminal evidence, an unresolved limitation.

Only checked `SETTLED` evidence may be presented as verified payment; a UI helper is not the verifier. Public browser checks recompute the canonical hash and verify Ed25519 against the current installation issuer key from `/api/session`. Public payment hash/source/network/timestamps and `SHA256_MATCH` are issuer claims, not an independent wallet query. Private export includes invoice/preimage evidence for independent checks. Optional worker Nostr authorship is separate: kind 30078 signs canonical sorted `{commitment,receiptId}` with `tags: [["d", receiptId]]`. Neither issuer nor browser signatures prove physical repair quality or legal identity. Cash/mobile-money provider verification is outside scope.

## Five Judging Criteria

Based on the [judge audit](dakar_bitcoin_hack_2026_judge_audit.md); no score or successful wallet gate is claimed.

| Criterion | Implemented evidence | Remaining validation |
| --- | --- | --- |
| Usefulness & Local Impact | Narrow technician workflow; consented interviews and measured pilot | No interviews or adoption evidence |
| Security by Design | Receive-only adapters, encrypted NWC, durable ambiguity handling, signed actions, private exports, pinned SDK patch and 122 tests | Independent audit and genuine wallet validation absent |
| UX/UI Quality | EN/FR browser-tested workflow, separate statuses, mobile overflow checks and actual offline synchronization | Physical-device usability, full accessibility and slow-network checks not certified |
| Working MVP | Implemented account-to-quote-to-customer-to-receipt flow; public hash/signature checks; reported tests/typecheck/build passes | 0 genuine wallet settlements; external signer/relay path unexercised |
| Clear Pitch & Docs | Setup, architecture, measured verification report, three-minute script, MIT license | Recording and public publication not completed |

The wallet implementation submission requirement is separate from these criteria. Documentation and sample jobs do not satisfy it.

## Measurement And Scope

Observed on 19 November: one local unpaid account-to-customer-to-receipt journey, one independently accepted private proof bundle, one offline draft synchronized once, and two seed quotes idempotently recreated. These are developer demonstrations, not customer adoption. Live verified payments: **0**. Interviews: **0**. Median completion time and real-device usability are not measured. See [VERIFICATION.md](VERIFICATION.md).

The local production server is localhost:3100, not a public deployment. Tests, typecheck, clean build, unpaid browser flow and offline recovery are recorded in [VERIFICATION.md](VERIFICATION.md). Wallet credentials/lab, external signer, public deployment and GitHub publication remain unavailable or not performed. Source is MIT licensed.

Remaining priorities: provision a real test-network receiving wallet and external payer, validate live settlement and external signer publication, perform physical-device usability/backup-restore checks, conduct interviews, and publish the submission. Mainnet is always disabled. No escrow, spending agent, fiat conversion, mobile-money API, credit score, identity certification or automatic public dossier is claimed.
