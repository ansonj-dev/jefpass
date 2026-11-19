# Dakar Bitcoin Hack 2026 — Competitor code audit and build-to-outperform strategy

**Checked:** 19 November 2026  
**Audience:** A builder choosing what to ship, not a jury member scoring the submissions.  
**Purpose:** Find what is saturated, what is weak in the implementations, where technical and product differentiation remains, and what evidence a stronger entry should show.

---

## 1. Competitive reality

This field is more sophisticated than a typical hackathon gallery. It includes working on-chain wallets, NWC, self-custody, LND Regtest topologies, Nostr audit trails, hold invoices, encrypted ledgers, payment-proof validation, and large AI/data systems. A generic “Bitcoin wallet for Africa”, “AI wallet assistant”, “Lightning tontine”, “merchant POS” or “cheap remittance app” is already competing with multiple submissions.

But implementation depth is uneven. In several submissions, the strongest demo screen is ahead of the underlying payment integration. There are also very good examples of honest scope separation: a testnet payment can still be a genuine Lightning payment, but it is not a mainnet payment or a merchant adoption result; a simulated payout is not a mobile-money integration; an NWC URL is not proof of a settled invoice.

**Your opportunity is not to add more modules. It is to solve one neglected part of an existing local workflow with a more trustworthy, smaller and better-evidenced end-to-end implementation.**

## 2. Product-category saturation map

| Category | Existing entries | What is already covered | Where the gap remains |
|---|---|---|---|
| Merchant POS / shop ledger | Caisse Teranga, SamaBoutik, Jaay, KudiWallet | FCFA/NGN-first price entry, invoice QR, sales history, WhatsApp receipts, stock/debt/cash ledger, NWC receive | Real payout/on-ramp, poor network recovery, independent proof of payment, multi-provider reconciliation, merchant onboarding evidence |
| Savings circles / tontine | Natt, CircleSats, Twese, KOLA | Recurring contributions, round schedule, member approvals, hold invoices or receiver-side invoice collection, ledger | Reliable payout, failure/refund safety, legal/trust model, independent field usage, non-custodial coordination, verified offline obligations |
| Classroom / wallet education | SatsClass, KAOS Bitcoin Academy, SmartPay Academy | Self-custody education, test sats, classroom missions, AI tutor | Evidence of learning outcomes, local-language facilitation, community merchant/teacher workflow; still test-money only |
| Team treasury / project funding | GreyFinance, NobPay | Roles, approvals, budgets, receipts, milestone proofs, hash ledger | Stronger independent controls, simpler target market, proof that survives server operator compromise, field adoption |
| Payment-on-delivery | FlashDrop | Hold invoices and shared-preimage release | Proof of goods/condition, dispute arbitration, production escrow design, independent courier workflow |
| Wallet / routing infrastructure | KudiWallet, SatsFlow, SatsGuard AI, Connect, SunuSats | Wallet keys, signing, NWC, routing/fee policy, invoice creation and validation | Actual protocol-grade integrations and production threat models; several are currently simulation-heavy |
| Climate / crypto risk | CarbonLens, CryptPilot | NDVI evidence scoring, graph wallet-risk analytics, Ethereum attestation | Real data and validation, independent review, Bitcoin-first challenge fit, narrow operational use case |

### Product choices to avoid as the primary concept

- Another generic non-custodial wallet with price conversion, QR and transaction history.
- Another four-round savings-circle front end whose payments/payout are simulated or only incoming.
- A “Lightning remittance cheaper by X%” claim without provider quotes, liquidity, FX source, corridor economics and real settlement.
- “AI verifies payments / fraud / carbon” where the model is only a mock, synthetic fixture or explanation layer.
- A large app that combines wallet, POS, marketplace, remittance, education and admin but cannot complete one credible workflow in three minutes.
- A custom invoice parser, BOLT11 encoder, HMAC voucher protocol or NWC implementation written from scratch when mature libraries already exist.

## 3. Repo-by-repo technical notes — what to borrow, what to beat

### 3.1 Caisse Teranga

**Files inspected:** `README.md`, `docs/THREAT_MODEL.md`, `app/config.py`, `app/lightning.py`, `app/nwc.py`, `app/main.py`, `app/db.py`, `tests/test_features.py`, `tests/test_v4.py`.

**Borrow:** merchant-specific FCFA price entry; bilingual French/Wolof PWA; tiny front end; server-side payment watcher; payment proof check; receive-only NWC; merchant-scoped access; no PII in logs; payout destination bound to a known account phone; strict production refusal of fake wallet; threat-model format.

**Beat:** close the gap between “a merchant can receive sats” and “a merchant can actually turn the value into the next action in the business.” Caisse's Mobile Money payout is simulated, the on-ramp calls a simulated payment path in demo, and the project still needs real partner liquidity/settlement. Offer a verified, carefully scoped merchant reconciliation experience rather than claiming mobile money has been solved.

**Important nuance:** its live NWC path is not fake by design, but the repository tests use a simulated local relay/wallet. README claims the code can connect to a real merchant wallet; no third-party merchant transaction was independently evidenced here.

### 3.2 SamaBoutik

**Files inspected:** Flutter `README.md`, `pubspec.yaml`, payment service/provider/client/screens; Laravel API `README.md`, `PaiementService.php`, `LightningService.php`, `PaiementController.php`, `WebhookController.php`, `PayDunyaService.php`, `config/paiement.php`, `routes/api.php`, payment serializers, LND Regtest provider/reconciliation, transfer execution and production settings.

**Borrow:** product and stock before wallet; sale state controls stock movement; webhook treated as a hint, followed by provider status lookup; PayDunya sandbox for mobile-money UX; Flutter mobile experience.

**Beat:** choose one high-value recurring event and make status and exception handling much more reliable. Its mobile-money path is test mode and withdrawal simulated; transfer quotes are demo-rate based. Don't clone its whole dashboard; prove one daily workflow with accurate settlement, reversals and receipt.

### 3.3 Jaay

**Files inspected:** `README.md`, `server.js`, `src/client/wallet.js`, `src/client/pay.js`, `src/client/esplora.js`, `src/client/nwc.js`, `src/client/nostr-backup.js`, `src/shared/paylink.js`, `src/shared/parse.js`, reports and tests.

**Borrow:** local-language note parsing with deterministic fallback; CFA-first display; WhatsApp share; debt ledger; encrypted backup; client-side self-custody and pay-by-link without customer registration.

**Beat:** correct the 98% threshold in the customer pay page. It filters new transactions and totals output to the requested address, but a payment that is up to 2% short can still trigger paid. Use exact fixed invoice amount/payment hash, reject underpayment, separately record overpayment and fees, and reconcile after re-entry/restart. Keep an NWC connection string out of plaintext browser storage; use a scoped wallet connection and encrypted server storage or a local secure storage strategy.

**Why it matters:** a shop owner cannot reconcile a day if 98%-paid invoices are marked as fully paid. This is a small but clear quality advantage a competitor can demonstrate.

### 3.4 SmartPay Africa

**Files inspected:** README, architecture, security overview, MVP limitations, P04 Regtest evidence, payment services/serializers/LND adapter/reconciliation, transfer execution/services, production settings, mobile payment and transfer services.

**Borrow:** explicit `confirm:true`, idempotency key, separate preview and send operations, server-side LND lookup, reconciliation command, accurate mock-vs-Regtest labels, detailed evaluator guide.

**Beat:** do not treat a global node balance as a personal wallet; use NWC or explicit per-user wallets. Don't build cross-border transfer UI until the destination actually receives fiat. Build a narrower feature with an independently verifiable outcome.

### 3.5 SatsClass

**Files inspected:** README, `THREAT_MODEL.md`, `SECURITY.md`, wallet/vault/classroom/lightning code and API routes.

**Borrow:** a clear one-session classroom job; QR onboarding; progress missions; plain language; one-command local network; least-privilege shop invoice macaroon; verify destination and amount before server-side practice payment; document the 6-digit PIN weakness.

**Beat:** measure outcomes. A teacher should be able to see how many learners created wallets, backed up correctly, sent a transaction, and can independently explain what a payment hash/fee is. Don't merely add another AI tutor. Native language, a measurable teaching intervention and real classroom validation would be stronger.

### 3.6 GreyFinance

**Files inspected:** README, deployment notes, `apps/satfamily/DESIGN.md`, `apps/satfamily/src/api.ts`, `App.tsx`, `server/satfamily.ts`, NWC gate `gate.ts`, `nwc.ts`, `bolt11.ts`, `proof.ts`, Convex schema/http, tests, security docs.

**Borrow:** separate request/approval/payment; server-enforced roles; no requester self-approval; exact invoice validation; payment hash/preimage proof; wallet fingerprint for retry reconciliation; budget reservation kept while outcome is uncertain; durable receipt and audit trail.

**Beat:** make the trust boundary simpler. GreyFinance's server holds delegated NWC spending power, and application approval is not multisig. A competing system can be stronger with wallet-side enforced allowance or a narrowly scoped payment request that the wallet owner explicitly confirms. Keep your budget model much narrower and demonstrate it on a genuine user workflow.

### 3.7 FlashDrop

**Files inspected:** README, `apps/server/src/flow.ts`, `lnd.ts`, `docs/test-results.md`, `tests/flow.test.ts`.

**Borrow:** shared-preimage hold-payment mechanism; expiry-height safety margins; explicit unknown status before the wallet send; encrypted release job; durable restart recovery; per-order lock; query every LND node before state transition; never equate a QR or PIN with physical delivery.

**Beat:** the missing layer is physical/dispute evidence, not more Lightning nodes. A buyer inspection step could be backed by a timestamped courier scan, delivery photo hash, optional independent witness, and both parties' signed statements. That evidence still does not prove the parcel's contents, so show dispute status and never overclaim. A local courier pilot beats a larger theoretical escrow system.

### 3.8 Natt

**Files inspected:** README, architecture, threat model, `src/tontine.js`, `src/nostr.js`, `src/lightning/bolt11.js`, `lnbits.js`, simulated adapter, `routes.js`, DB schema and tests.

**Borrow:** the actual rotating order; language choice; 128-bit member token; group-scoped signed Nostr receipts; invoice amount matching; organizer/member visibility; assistant with no payment tools.

**Beat:** payment state recovery. `claimPayout()` sets `paying`, then resets to `collecting` on any send exception. A timeout may arrive after the node has processed the payment. The correct model is `unknown` + lookup by payment hash, keep the amount reserved, and never retry automatically until the original result is resolved. Also avoid storing the whole pot in a custodial wallet if you can solve the user need with individual hold-invoice coordination.

### 3.9 CircleSats

**Files inspected:** README, architecture/security/deployment readiness, `src/store.js`, `src/nwc-receiver.js`, payment evidence and judging evidence.

**Borrow:** strict receive-only NWC capability verification; wallet network and pubkey pinning; payment hash/amount/invoice exact-match; preimage check; local durable JSON ledger with checksum/backups; explicit payment-mode label; publish evidence that can be independently recomputed.

**Beat:** close the payout loop. Current public Vercel page is simulated, the full Node app is local, and the 100-sat Mutinynet proof is a real test-network incoming payment paid by a faucet. `approvePayout()` only records member approvals; `recordSettlementClaim()` marks an unverified transfer claim; `settleDemo()` completes a simulated payout. No outgoing Lightning payout is verified. A stronger entry would only mark a round completed after the recipient wallet confirms the exact payout.

### 3.10 NobPay

**Files inspected:** README, architecture, security and several audits, Bitnob report, `lightningFlows.ts`, `nwc.ts`, `ledger.ts`, `commitments.ts`, `anchors.ts`, `proofChecks.ts`, `witness.ts`, upload handling, server and test paths.

**Borrow:** proof as a first-class object; salted commitment for private GPS and notes; public chain-of-hash dossier; witness review; image deduplication; exact invoice matching; hold funds in unknown state until lookup; do not allow AI to decide a release.

**Beat:** reduce complexity and close the trust loop. A long milestone platform with server-held delegated wallets and proof that can be disputed is difficult to explain quickly. Pick one milestone type and one actor; publish the proof checklist and a public verifier. Make wallet approval and settlement evidence independently checkable. Most importantly, make the public deployed code commit match the reviewed code; NobPay's 12 Nov security review says local-only fixes awaited push/manual deploy.

### 3.11 KudiWallet

**Files inspected:** README, `src/wallet.js`, `src/app.js`, `server.js`, `api/index.js`, `DEMO_SCRIPT.md`, cross-validation tests.

**Borrow:** real browser-side signing, independent-library cross-validation, transparent statement that Lightning settlement is simulated, a no-funds demo path, explicit test wallet warning.

**Beat:** integrate a real Lightning wallet adapter and prove invoice lookup and preimage settlement, not merely signed invoice creation. Keep exact network/address validation and test transaction construction with BIP test vectors. The current 100,000-round vault and public demo phrase are testnet-only trade-offs, not safe mainnet defaults.

### 3.12 SatsFlow

**Files inspected:** full `src/satsflow_engine.py`, README and tests.

**Do not copy:** protocol-looking invoice strings with fake signatures, a paywall that returns the “settled” preimage to the client, static topology disguised as route optimization, a baked-in voucher key and replayable HMAC vouchers. The fake payment response is a mock; the engine cannot make a real wallet settle an invoice. The L402 challenge is bypassable as implemented.

**Opportunity:** real invoice decoding with a maintained library; query route fees from a real node; display a transparent estimate; wallet confirmation; store an idempotent settlement proof; never let the paywall return its own secret to the requester.

### 3.13 SatsGuard AI

**Files inspected:** README, `satsguard_engine.py` all 416 lines, test file.

**Do not copy:** `NostrWalletConnectClient.execute_rpc()` is a local branch that calculates a pseudo-preimage from the invoice string and returns `SETTLED`; it does not connect to a relay, sign a kind-23194 request or verify a kind-23195 wallet response. The orchestrator invents `lnbc{amount}u1p...`, then increments “settled” telemetry. The voucher HMAC key is a literal constant in source; its short tag has no expiry or replay registry.

**Opportunity:** AI may parse a sentence into an intent, but do not let model or mock result authorize settlement. Have the backend decode a real BOLT11 invoice, enforce caps, query wallet capabilities, request explicit approval, reconcile by hash and prove the preimage. Use an actual Nostr SDK.

### 3.14 CarbonLens

**Files inspected:** README, scoring/NDVI/geometry code, API/chain code, Solidity registry and tests, architecture/threat/security/responsible-AI docs.

**Borrow:** methodology caveats; testable deterministic score; explicit cached/live source label; contract role separation and bounds; duplicate geometry commitment; source traceability.

**Do not copy:** a vegetation indicator is not carbon storage or additionality. The current score cannot be represented as certified carbon offset quality. The contract is Ethereum Sepolia, not Bitcoin; the privileged verifier is a centralized trust oracle; unresolved high dependency advisories are reported. It fails the Bitcoin/Lightning wallet gate.

### 3.15 CryptPilot

**Files inspected:** README, audit/reality-check, integration notes, architecture, Firebase auth, bridge allowlist, crypto-service check/pipeline/model/policy/graph/explanation/credit/payment code and decision log.

**Borrow:** address secret guard, strict allowlisted bridge, grounded AI explanations and explicit UNKNOWN state, synthetic-vs-real dataset labeling, auth matching user id, and a reproducibility log.

**Do not copy:** do not present a synthetic dataset model as if it scores live wallet behavior. The project's own decision log says Elliptic++ could not be downloaded during implementation; all code was exercised on synthetic fixtures and no real model metric is supported. No meaningful Bitcoin/Lightning wallet was found for the challenge. The product is huge and combines personal finance, graph analytics, credits and voice.

### 3.16 SubZero Vault

**Files inspected:** README, NOTES, Python standard-library server, BM25 engine and larger JS DOM/engine test files.

**Borrow:** product polish, self-hosted simplicity, dense but readable test harness, data import/export, backups and accessibility checks.

**Do not copy:** it does not meet the Bitcoin/local impact brief. Its own README calls it a standalone reference build rather than a timed program entry. Strong general engineering cannot compensate for challenge mismatch.

## 4. Cross-cutting technical failures to avoid

These are specific issues in the inspected code, not hypothetical best-practice slogans.

| Issue | Seen in | Why it matters | What a stronger implementation does |
|---|---|---|---|
| Timeout treated as failure, then spend state reset | Natt | Wallet may have processed payment even if response timed out; retry could double-pay | `unknown` state; keep funds reserved; reconcile exact payment hash; no automatic retry |
| Partial payment accepted as full | Jaay pay page | 98% threshold can misstate the merchant's sale receipt | Exact amount/hash matching; underpayment/overpayment states; no rounding threshold |
| Public demo and actual backend have different behavior | CircleSats, SmartPay, NobPay and others | Judges can believe a fake/simulated UI is the real operational system | Persistent labels on every view; separate test mode; report the selected provider and network in receipts |
| “Approval” represented as a completed payout | CircleSats | Member vote is not proof that recipient received money | Keep `approved`, `paying`, `unknown`, `settled`, `failed` separate; completion only after recipient wallet proof |
| NWC pseudo-RPC presented as real | SatsGuard AI | A local function returning SETTLED is not NIP-47 | Real Nostr events, encrypted request, signed response from pinned wallet pubkey, correct event id, method scope, and invoice proof |
| Paywall returns the same preimage needed to bypass itself | SatsFlow | Payment gate is bypassable without payment | Never disclose the payment secret before settlement; independently verify hash/preimage from wallet lookup |
| Fake BOLT11 signature | SatsFlow | Wallets reject it; valid Bech32 checksum is not a valid BOLT11 invoice | Use established encoder/decoder and test with independent wallets and BOLT11 vectors |
| Embedded static voucher HMAC key | SatsGuard AI, SatsFlow | Anyone can mint accepted vouchers; no replay defence | Device/public-key signature, expiry, nonce/replay registry and server reconciliation; label as authorization not cash |
| Shared server-held wallet controls | Natt, SmartPay, GreyFinance, NobPay | Operator compromise can move or freeze assets | Receive-only scopes, wallet-side limits, explicit end-user authorization and transparent trust model |
| Testnet/regtest confused with live funds | Many entries | Testnet evidence validates protocol path, not market adoption or real financial service | State network in every screen and receipt; report mainnet, testnet, regtest and simulated separately |
| Synthetic model data | CryptPilot | A model score on fixtures is not evidence on the production dataset | Publish data provenance, model card, evaluation split, baseline, calibration and failure behavior |
| Weakly validated external evidence | CarbonLens | NDVI cannot prove carbon or land rights | Use a narrow evidence claim, multiple data sources, independent verifier and clear unknown state |
| UI feature list exceeds working scope | SmartPay, CryptPilot, many concepts | Judges cannot find the completed path | One primary job; everything else hidden behind roadmap |

## 5. How to outperform the best entries

### 5.1 Win on one complete workflow, not feature count

Choose one primary user and one repeated moment where today's process fails. A two-minute flow should show:

1. user initiates a real task in local currency or familiar terms;
2. system creates a real Bitcoin/Lightning payment request or uses the user's wallet;
3. the payer approves in a wallet or on-device signing flow;
4. backend checks the exact payment state and cryptographic evidence;
5. a durable receipt is created and exported/shared;
6. interruption/retry is handled safely without duplicate payment;
7. the UI explains what happened in plain language and labels the network.

A smaller product that does this is stronger than a broad demo where 5 of 8 tabs are simulated.

### 5.2 Make uncertainty a first-class product feature

Many entries check for success; fewer handle the uncomfortable case where a wallet timed out after a send request. Model payment state as:

- `draft`
- `invoice_created`
- `awaiting_payment`
- `paying`
- `unknown` (payment might have happened)
- `settled` (wallet lookup and proof agree)
- `failed` (provider has authoritative failure)
- `expired`
- `refund_pending` / `refunded` if refunds are supported

Persist an idempotency key and payment hash before or immediately around external calls. Reconcile before any repeat send. Never free reserved value while a payment outcome is unknown. This directly beats the Natt error-state weakness and matches the good patterns in GreyFinance, SmartPay and FlashDrop.

### 5.3 Prove the wallet is real

Judges should be able to see:

- network identity (`signet`, `mutinynet`, `regtest`, `mainnet`);
- decoded BOLT11 amount, expiry and payment hash;
- explicit wallet capability and destination (no hidden shared wallet);
- a payment lookup from the wallet provider;
- a preimage whose SHA-256 equals the invoice hash, when the provider supplies it;
- a receipt tied to that evidence;
- separate label for mock/simulated flows.

A valid BOLT11 signature proves invoice authenticity, not payment settlement. A valid preimage proves a particular HTLC payment settled, not that a parcel arrived or a merchant received fiat. Keep the claims precise.

### 5.4 Show a real deployment/test distinction

The strongest submissions have a reproducible local Docker command and an accessible demo. If you can only host a demo, use a public testnet/test node and keep the provider/network label permanently visible. Add a `DEMO_MODE=true` switch which is impossible to use when production wallet credentials are enabled; never make a “simulate paid” API callable in the live network mode.

### 5.5 Earn trust with five tests a judge can understand

Beyond a big test count, give the judges a small verification suite:

1. real invoice create → external test wallet pays → status reconciles → correct receipt;
2. wrong amount/hash/preimage is rejected;
3. duplicate API request doesn't produce duplicate payment;
4. payment timeout produces `unknown` and retry doesn't send again;
5. user A cannot read, approve, pay or export user B's record.

Include the exact command, expected output, and what the test doesn't cover. Add an optional live testnet proof file with hashes and timestamp (no wallet secret).

### 5.6 Measure the user outcome, not the chain metrics

A judge will understand:
- time to create and confirm one merchant sale;
- number of taps from opening app to paid receipt;
- success rate on a throttled 3G network;
- time to recover after connection loss;
- amount of bookkeeping no longer manual;
- number of merchants or volunteers who completed a supervised trial.

Do not report “users served”, 0.2% fees saved, or 100% offline unless measured. For a one-day demo, report a planned pilot as a target, not as traction.

## 6. Opportunity map: where the visible field is still weak

### A. Last-mile merchant settlement and reconciliation

Merchant POS is crowded, but the last step from sats received to a usable business record/value remains incomplete in multiple projects. Caisse and SamaBoutik simulate cash-out; Jaay uses an on-chain pay link and credit ledger; none of the audited submissions established a fully integrated, independently verified local mobile-money off-ramp. A more focused implementation could do:

- accept cash and Lightning in one sale ledger;
- distinguish exact, underpaid, overpaid, expired and unknown;
- reconcile invoice state after the merchant loses connectivity;
- provide a receipt with payment hash + locally meaningful amount + date;
- support a real authorized partner only if sandbox/credentials are truly available, otherwise keep off-ramp as a clearly labelled manual referral/not integrated.

**Risk:** real mobile-money API access, partner licensing, FX, liquidity and KYC cannot be invented. Do not promise automatic XOF conversion without a provider.

### B. Safe offline authorization, not fake offline payment

Several entries mention offline mode. Most do not complete a secure, replay-resistant, two-party settlement process without connectivity. A better approach is a *queued signed intent* or *payment authorization request* that cannot be shown as paid until online wallet reconciliation. The offline UI should explain `pending sync`, expiry and duplicate prevention. A voucher can prove an authorization signature; it cannot prove money has moved while offline.

### C. Trustworthy group or escrow release

Tontines and escrow are popular categories. The opportunity isn't another group dashboard. It is a correct state machine for lock/release/refund and a public independent proof trail. Use hold invoices where supported; otherwise do not call an ordinary incoming invoice “escrow”. Build the payout/timeout state transition with tests against real node behavior.

### D. Evidence verification with bounded claims

NobPay, FlashDrop and CarbonLens each connect evidence to a financial decision. A differentiator is a narrow verifiable receipt bundle: file hash, timestamp, signer, invoice hash/amount, reviewer response, and public commitment; private details remain encrypted/off-chain. A hash proves the file hasn't changed since commitment; it does not prove it is truthful, new, or from the claimed location.

### E. Nostr/NWC as real plumbing

Some products treat Nostr as a marketing badge, and some treat NWC as a string field. Strong implementation means: least-privilege methods; pin wallet identity; request/response event verification; BOLT11 exact amount/network/expiry validation; preimage/hash check; relay timeout/reconnect; secret redaction and revoke/change-wallet path. Caisse, GreyFinance and CircleSats show useful pieces to study.

## 7. A feasible, competitive concept direction (not the full idea formation yet)

The evidence points toward a product area, not a final name or architecture: **a trustable payment-and-receipt layer for a very specific merchant workflow, where the hard part is getting the payment status right under unreliable connectivity and keeping the ledger usable after the phone drops offline.**

The version worth competing with is not “another POS”. It would be a very narrow, low-data merchant cashier for one merchant category and one corridor/market, with:

- FCFA-first amount entry and exact invoice creation;
- a real NWC or LND/Signet/Mutinynet test-payment path;
- a payment state machine that never treats a timeout as failure;
- immutable-ish receipt evidence (invoice hash, amount, wallet-verified status, timestamp, source, network);
- offline queue for *recording intent*, never false offline settlement;
- one-tap WhatsApp/shareable receipt and daily ledger export;
- an audit screen the merchant or customer can verify without trusting a green UI check.

This direction overlaps with Caisse/SamaBoutik/Jaay, so it is not automatically unique. It becomes differentiated only if the payment uncertainty/offline recovery is materially better, the merchant workflow is tested with real people, and the demo proves an external wallet payment and safe recovery. The exact persona, feature boundary, evidence plan and architecture should be formed as the next stage, after selecting one problem and one target user.

## 8. A practical build order for the remaining hackathon window

Given the 20 November 2026 20:00 UTC deadline, don't begin a giant rewrite. Use this build order once the concept is selected:

1. **Choose one user and one workflow.** State the user, current workaround, failure cost and first pilot location/persona.
2. **Make the Bitcoin/Lightning interaction real first.** Use an established wallet/node library and a funded test network. No custom cryptography.
3. **Build the state machine and proof record.** Model `unknown` and retries before adding dashboards.
4. **Add the simplest low-bandwidth screen.** Local currency first; sats and network underneath; clear exact statuses.
5. **Add one real external integration or be honest it is absent.** Do not build a fake mobile money response for the demo.
6. **Write five critical tests and a threat model.** Include replay, duplicate send, false callback and cross-user access.
7. **Deploy one judge-ready path.** Public link, seeded test account or frictionless no-signup demo, concise README, 3-minute video, ZIP.
8. **Record evidence.** Screenshot of wallet settlement, redacted hash, preimage verification result, network and timestamp; no secrets.

## 9. What to study first in other repos

- **Payment-proof and ambiguous state:** GreyFinance, SmartPay Africa, FlashDrop.
- **NWC receiver scopes and signature checks:** Caisse Teranga, CircleSats, GreyFinance.
- **Merchant-first UI/flow:** Caisse Teranga, Jaay, SamaBoutik.
- **Nostr public receipt/audit:** Natt, NobPay.
- **Low-bandwidth/classroom UX:** SatsClass.
- **Honest limits, local evidence and deployment handoff:** FlashDrop, CircleSats, CarbonLens, NobPay.
- **Avoid protocol-code pitfalls:** SatsFlow and SatsGuard AI.

## 10. Final competitive recommendation

Aim to be **the most trustworthy small product in the competition**, not the biggest. In this gallery a large portion of the value propositions already exist. A clear local problem, an actual wallet transaction, an exact and restart-safe payment receipt, and a demo that openly tells judges what is simulated will beat a feature list built around Nostr/AI/USSD that does not run against a real wallet.

The next decision should be made from the white-space map above. Once the concept is fixed, create its problem statement, primary persona, MVP boundary, technical architecture, threat model, demo script, README and acceptance tests as one coherent build brief.

## 11. Audit scope and limitations

This is a public-source competitive code review, not a formal security audit or independent test run. Public READMEs, high-value design/security/limitations documents, repository structure, test inventories, and key invoice/payment/authorization/state-transition modules were reviewed. In large repositories, not every CSS/image, generated file, dependency lockfile, framework component or unrelated product module was read line by line. No repository was cloned and no complete test suite was executed in this environment. All test totals and live-payment claims are attributed to the repository documents unless specifically described as code-inspected behavior. The scope and confidence for each repo are captured in the companion judge report.

## Source repositories

- [Caisse Teranga](https://github.com/Binetuuu/caisse-teranga-)
- [SamaBoutik app](https://github.com/Faith-time/samaboutik-app) / [API](https://github.com/Faith-time/samaboutik-api)
- [Jaay](https://github.com/sachinsivapragash/jaay)
- [SmartPay Africa](https://github.com/Merveil-ATIPOT/smartpay-africa)
- [SatsClass](https://github.com/thesithunyein/satsclass)
- [GreyFinance](https://github.com/greyw0rks/grey-payroll)
- [FlashDrop](https://github.com/thecosmos42/flashdrop)
- [Natt](https://github.com/shineyrbl-byte/natt)
- [CircleSats](https://github.com/0xNexuz/circlesats)
- [NobPay](https://github.com/mouhaa-md/NobPay)
- [KudiWallet](https://github.com/jozzy001mail/kudiwallet)
- [SatsFlow](https://github.com/jeffrey-graham/dakar-satsflow-lightning)
- [SatsGuard AI](https://github.com/amazing200guy1-a11y/satsguard-ai)
- [CarbonLens](https://github.com/shikhon-rahaman/carbonlens)
- [CryptPilot](https://github.com/madhavzanwar/crypt-pilot)
- [SubZero Vault](https://github.com/draarivpatel-ui/subzero-vault)
