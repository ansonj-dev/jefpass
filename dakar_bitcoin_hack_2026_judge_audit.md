# Dakar Bitcoin Hack 2026 — Judge-oriented project and code audit

**Research date:** 19 November 2026  
**Hackathon:** [Dakar Bitcoin Hack by BTrust](https://dakar-bitcoin-hack-2026.devpost.com/)  
**Purpose:** Compare the accessible project field against the official challenge and judging criteria, distinguishing product claims from repository-backed implementation.

---

## 1. Executive verdict

The strongest entries are not the ones with the most blockchain terminology. They are the ones that pick a familiar African workflow, demonstrate a real Bitcoin/Lightning wallet interaction, and are unusually honest about exactly what has and has not happened.

The strongest *code-backed* competitors in the available evidence are:

1. **Caisse Teranga** — best combination of a concrete daily merchant problem, low-bandwidth French/Wolof PWA, usable POS flow, broad security notes, and a real NWC/LNbits integration path. The important boundary: its public/demo paths include fake Regtest payments; Mobile Money on-ramp and cash-out are simulated. Its NWC tests use a local simulated relay/wallet; I did not find independent public customer-payment evidence.
2. **GreyFinance** — strongest visible engineering around role separation, budget reservations, ambiguous payment recovery, wallet capability checks and payment-proof verification. Narrower target (small teams) and delegated server-side spending means the company still trusts its server/NWC controls; application approval is not multisig.
3. **FlashDrop** — one of the clearest technically distinctive payment mechanisms: a three-node LND Regtest demonstration uses a shared preimage/hash across buyer→seller and seller→courier hold-invoice legs, then releases after buyer authorization. Strong test evidence, but only local Regtest, centralized node custody, and no cryptographic proof of parcel condition.
4. **SatsClass** — a very well-shaped classroom learning product with actual test-network transactions, self-custody education, a working local LND practice purchase, explicit threat model and documented test flows. Its six-digit PIN is explicitly not suitable for real funds.
5. **Jaay / SamaBoutik / NobPay / Natt / CircleSats** — each has a strong local product story, but with material differences in integration completeness, payment custody, ambiguity handling and public evidence.

**Important:** These are desk-review judgments, not the actual jury's scores. The repositories were inspected through public GitHub content; no repo was cloned or had its full test suite run by this review. Test totals are attributed to repository documentation, not represented as independently rerun results.

## 2. What the official hackathon asks for

The organizer's headline is to build tools that improve the lives of African people around or on top of Bitcoin, Lightning, Nostr and AI. The page asks for solutions to day-to-day regional problems, encourages building in public, and expects open-source outputs.

The official published criteria are on a 1–5 scale:

| Criterion | What the judges are being asked to reward |
|---|---|
| Usefulness & Local Impact | A well-scoped real problem; a clearly named primary user; a workflow that changes; a believable reach estimate |
| Security by Design | Small attack surface; threat model; least privilege; safe secret handling; validated input; privacy-preserving logs; proven Bitcoin/Lightning libraries |
| UX/UI Quality | Usable on slow connections and mid-range phones; clear language and errors; readable, accessible controls |
| Working MVP | A demonstrable end-to-end flow; reproducible setup; seed/sample data; a happy path that can be checked rather than a mockup |
| Clear Pitch & Docs | A coherent short demo; README with setup, architecture, limitations, metrics and next steps |

### Hard submission gate, separate from the score

The submission instructions require a prototype/MVP/PoC and at least a Bitcoin or Lightning wallet implementation. The public rules and metadata have a mismatch: the prose eligibility says the participant should reside in Africa, while structured eligibility data says students only and also lists territory exclusions. Do not infer eligibility from one version; obtain organizer confirmation if this is relevant.

The official deadline is **20 November 2026 at 20:00 UTC** (15:00 EST). The structured Devpost form information reports a required video URL and ZIP upload, while the prose has described an accessible MVP or demo video as acceptable. Safest preparation is a public repository, reachable working demo or public demo video, a concise presentation, and a single ZIP; check the actual submission form before final submit.

**Scoring rule used here:** the five criteria are treated equally because no weighting was published. The average is a reviewer aid, not an official ranking formula. Passing the wallet requirement is shown separately; it is not smuggled into the average.

## 3. Scoring method and confidence

Scores are provisional, evidence-based estimates:

- **5:** unusually strong, demonstrable evidence for the criterion.
- **4:** strong; meaningful limits remain but are disclosed.
- **3:** credible prototype with material gaps.
- **2:** partial, mostly simulated, weakly validated or poorly matched.
- **1:** absent, misleadingly claimed or materially broken in the inspected code.

Confidence labels:
- **High:** public source repo and key product/security/test code inspected.
- **Medium:** repo available but only part of its larger source tree could be reviewed; or crucial state is local-only.
- **Low:** no canonical repository could be established; score is based on Devpost description only.

Wallet gate:
- **Yes:** code shows Bitcoin/Lightning wallet functionality, at least on test networks.
- **Conditional:** wallet path exists but settlement is simulated, incomplete, or insufficiently evidenced.
- **No:** no meaningful Bitcoin/Lightning wallet implementation was visible, or the supposed implementation is only a simulation/stub.
- **Unknown:** no canonical source repository was available to verify it.

## 4. Comparative scorecard

| Project | Local usefulness | Security | UX | Working MVP | Pitch/docs | Mean | Wallet gate | Evidence confidence |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Caisse Teranga | 5.0 | 4.0 | 4.7 | 4.0 | 4.8 | **4.50** | Yes / live NWC path, demo modes simulated | High |
| GreyFinance | 4.1 | 4.5 | 4.2 | 4.4 | 4.9 | **4.42** | Yes / Regtest + NWC | High |
| SatsClass | 4.4 | 4.0 | 4.8 | 4.4 | 4.8 | **4.48** | Yes / Signet + local Lightning lab | High |
| SamaBoutik | 5.0 | 3.8 | 4.6 | 4.1 | 4.5 | **4.40** | Yes / Regtest/LNbits; production settlement not established | Medium |
| FlashDrop | 4.6 | 4.3 | 4.0 | 4.5 | 4.8 | **4.44** | Yes / three-node Regtest | High |
| NobPay | 4.8 | 4.0 | 4.1 | 3.7 | 4.7 | **4.26** | Yes / NWC payment workflows | Medium–High |
| Jaay | 4.9 | 3.5 | 4.5 | 3.7 | 4.4 | **4.20** | Yes / Signet on-chain + NWC receive | High |
| Natt | 4.8 | 3.2 | 4.8 | 3.4 | 4.5 | **4.14** | Conditional / LNbits adapter, public demo simulated | High |
| CircleSats | 4.7 | 4.0 | 4.5 | 3.2 | 4.7 | **4.22** | Yes for incoming Mutinynet test payments; no outgoing payout | High |
| SmartPay Africa | 4.2 | 4.0 | 4.0 | 3.5 | 4.6 | **4.06** | Yes / local Regtest only | High |
| KudiWallet | 4.2 | 3.5 | 4.2 | 3.5 | 4.6 | **4.00** | Yes for on-chain testnet; Lightning settle is simulated | High |
| CryptPilot | 3.5 | 3.5 | 4.2 | 3.0 | 4.5 | **3.74** | No / no meaningful Bitcoin/Lightning wallet seen | High |
| CarbonLens | 3.0 | 2.8 | 3.8 | 3.4 | 4.5 | **3.50** | No / Ethereum Sepolia only | High |
| SubZero Vault | 1.5 | 4.5 | 4.5 | 4.6 | 4.5 | **3.92** | No / unrelated to Bitcoin | High |
| SatsFlow | 3.8 | 1.5 | 3.6 | 1.4 | 3.3 | **2.72** | No / claimed protocol operations are simulations | High |
| SatsGuard AI | 3.0 | 1.5 | 3.8 | 1.4 | 2.6 | **2.46** | No / NWC client is a mock implementation | High |
| Twese | 5.0 | 4.0 | 4.5 | 3.6 | 4.5 | **4.32** | Unknown / Devpost says sandbox hold invoices | Low |
| KOLA | 4.5 | 3.5 | 4.1 | 3.3 | 4.2 | **3.92** | Unknown | Low |
| SunuSats | 3.8 | 3.4 | 4.2 | 2.6 | 4.0 | **3.60** | Unknown / writeup discusses NWC, demo simulation | Low |
| AFRISWIFT | 4.1 | 2.8 | 3.8 | 2.7 | 3.4 | **3.36** | Unknown / simulated fiat ledger described | Low |
| Ojo POS | 4.2 | 3.5 | 4.0 | 3.0 | 3.8 | **3.70** | Unknown | Low |

### How to interpret the top of this table

- **SatsClass** is rated highly because it makes the wallet itself the learning experience. The product has an identifiable facilitator and learner, rather than an abstract “Africa user”. It is test-network-only and its PIN is not a real-money custody standard.
- **Caisse Teranga** has the strongest everyday merchant proposition in the visible repo set. It is much more than a wallet: it turns a market sale into an invoice, verified status, receipt, sales ledger and merchant workflow. Its Mobile Money exit is not live; do not conflate the simulated payout screen with a cash-out integration.
- **GreyFinance** and **FlashDrop** show especially strong technical integrity in difficult payment states. GreyFinance focuses on who may approve/pay and preserving budgets across uncertainty. FlashDrop coordinates a multi-leg hold flow and reconciles after restarts.
- **NobPay** has a highly differentiated milestone-proof idea but deployment and audit evidence need care: its latest security review says corrections were on the author's local machine and require push/manual redeploy. This makes local test claims weaker evidence for the public build.
- **Twese** could rank high on concept alone, but its repository was not identified, and the Devpost writeup explicitly says sandbox sats. It is not fair to score it as code-verified.

## 5. Repo-by-repo judge assessment

### 5.1 Caisse Teranga — `Binetuuu/caisse-teranga-`
**Product:** French/Wolof point-of-sale for small Senegalese merchants. Enter FCFA, create Lightning BOLT11 invoice, show QR, reconcile payment server-side, record sale, share receipt and generate sales summaries. It also records cash sales and supports a fixed LNURL poster.

**What the code supports:** FastAPI + SQLite + compact PWA; LNbits invoice/read integration; merchant-supplied receive-only NWC; strict invoice amount/hash validation; payment proof validation; merchant isolation; progressive PIN lockout; encrypted phone and NWC credentials; HMAC-backed phone lookup; CSRF/origin checks; throttling; non-root/read-only container configuration. The NWC adapter uses NIP-04 encryption and BIP-340 Schnorr signatures and validates reply signer and request correlation.

**Judge strengths:** very clear user, local language/context, low-data design, multiple payment modes and visible sales record. Strong threat-model document. The wallet integration is not decorative: the app can create and monitor an invoice against the merchant's wallet.

**Judge caveats:** public/default demo uses a fake wallet with signed `lnbcrt` invoices; the on-ramp and withdrawal process are simulated. The 51 tests are stated in README; they were not run here. NWC is tested with a local simulated relay/wallet. A receive-only NWC flow is a valid direction, but it does not magically solve cash liquidity or conversion to local currency. No independently verified merchant pilot or live mobile-money payout was found.

**Criterion view:** excellent local fit and docs; strong security engineering for a hackathon; strong UX. The remaining credibility gap is not more features: it is one independent, observable, real Lightning payment and a real merchant test, plus clear test-vs-live labels throughout.

### 5.2 GreyFinance — `greyw0rks/grey-payroll`
**Product:** small-team Bitcoin treasury; employee expense request, separate finance/owner approval, spend limits, budgets, incoming invoices and receipts.

**What the code supports:** Nostr NIP-98 request authentication; NWC NIP-47; BOLT11 parsing; capability checks for `make_invoice`, `lookup_invoice`, `pay_invoice`; payment hash and preimage proof validation; wallet-connection fingerprints; atomic budget reservation; role checks; uncertain-payment reconciliation; explicit `unknown`/`paying` states and no blind retry. Tests exercise the server router and simulated wallet adapter. Deployed backend uses Convex while the local integration uses SQLite + LND Regtest.

**Judge strengths:** this repository is unusually strong at payment correctness, access control and durable financial state. The threat model explicitly says application approvals are not cryptographic multisig. It distinguishes local Regtest evidence from the production backend.

**Judge caveats:** the company server retains a delegated NWC connection, so the server and the wallet provider remain trust boundaries. App approval is not a cryptographic threshold signature. The buyer is a small, already-Bitcoin-positive team, not necessarily the largest everyday market segment. Do not mistake the local Regtest demo or public test evidence for production mainnet settlement.

**Criterion view:** a technical execution and security leader; a somewhat narrower local-impact story. A judge can follow role differences and check preimage proof.

### 5.3 FlashDrop — `thecosmos42/flashdrop`
**Product:** payment-on-delivery for social-commerce merchants and couriers. Buyer funds a hold, seller funds a delivery-fee hold, buyer authorizes after inspection, and one shared preimage settles the two legs.

**What the code supports:** Fastify + SQLite; buyer/seller/courier LND nodes; `addHold`, `settle`, `cancel`, invoice/payment lookup; HTLC expiry-height safety margin; release secret encrypted with AES-256-GCM; state machine; per-order lock; worker/restart reconciliation; restricted macaroons and TLS certificates. Local evidence dated 12 November reports three consecutive complete API journeys and one browser journey on three Regtest nodes. The tests include restart recovery and waiting for payer-side failure before showing a canceled state.

**Judge strengths:** a real friction point and a strong technical twist: payment coordination after inspection without pretending a QR proves a parcel was delivered. The repo says exactly that a buyer disclosure is not proof of physical handover. Evidence is more specific than a screenshot-only demo.

**Judge caveats:** all funds are fictitious Regtest sats; the host controls all three nodes; the site is not a public money-moving product. The test report says independent-device/camera/mobile checks and balance/fee accounting were not run. Only a small number of scripted role journeys were demonstrated.

**Criterion view:** a distinctive, demonstrably working local prototype with excellent communication. A real courier field pilot and a more trust-minimized or independently witnessed delivery condition are next, not pretending the cryptography proves the physical world.

### 5.4 SatsClass — `thesithunyein/satsclass`
**Product:** guided Bitcoin classroom. Learners create self-custodial browser wallets, get practice sats, back up, send real Signet transactions and perform a local Lightning practice purchase.

**What the code supports:** browser BIP84 wallet, client-side signing, AES-GCM/PBKDF2 seed vault, per-class 48-hour roster, teacher token, faucet claim protection, on-chain transaction verification, LND class/shop pair with destination restriction, amount cap and least-privilege shop macaroons. Threat model and security policy are detailed.

**Judge strengths:** clear primary buyer/facilitator and session; highly usable learning path; wallet is the product, not an extra tab. Good docs and a one-command Docker lab.

**Judge caveats:** all sats are test-network only. Six-digit PIN is offline-brute-forceable if browser storage is copied; this is documented and accepted only for worthless practice funds. Class node uses server-side admin macaroon for practice Lightning. The faucet is a hot wallet. Independent classroom adoption is not claimed.

**Criterion view:** exceptionally coherent educational MVP. To outperform it, offer measured classroom completion, native local-language learning and teacher workflow rather than more quiz/AI widgets.

### 5.5 SamaBoutik — `Faith-time/samaboutik-app` + `Faith-time/samaboutik-api`
**Product:** Flutter stock, sales and profit tool for small Senegalese shops; cash, Lightning and PayDunya mobile-money payment.

**What the code supports:** Flutter API service/status polling; Laravel 13 endpoints; DB sale/payment records; stock decrement only after verified payment; Lightning invoice via LNbits; PayDunya sandbox; webhook is a notification and server re-queries provider state; FCFA conversion through BTC price + euro/CFA peg. The API docs clearly say mobile-money test mode and withdrawals simulated.

**Judge strengths:** recognizable day-to-day shop flow, stock and sale accounting beyond a wallet, native mobile implementation and published APK. Local impact is easy to explain.

**Judge caveats:** PayDunya mobile-money calls use sandbox; payouts simulated. LNbits path can be configured, but no independent production settlement evidence found. Some API docs say a demo LNbits node is ideal for prototype, not actual customers. No evidence of shop onboarding/retention.

**Criterion view:** strong utility and working app, but real-world financial rails are not yet complete. Be precise about sandbox vs live.

### 5.6 NobPay — `mouhaa-md/NobPay`
**Product:** conditional funding and milestone-based disbursement for projects, school fees and merchant restocking, with proofs, witness review, hash-chained ledger, Bitcoin anchoring and NWC.

**What the code supports:** Next.js 16/TypeScript, project/step/proof records, file-type sniffing and upload caps, salted commitments for GPS/notes, AI review with user decision kept separate, witness tokens, NWC/BOLT11/payment-hash handling, OpenTimestamps anchors and exportable dossier. `lightningFlows.ts` retains reserved balances during ambiguous outcomes and reconciles by original wallet identity. This is technically meaningful.

**Judge strengths:** differentiated problem, rich provenance workflow, privacy thinking and a serious threat-model/architecture/document set. It does not claim that AI proves a site visit or that satellite photos certify construction.

**Judge caveats:** server-held delegated wallet credentials create central trust. An approval in the app is not multisig. The security report on 12 Nov explicitly says fixes in that audit are only in the author's local tree until pushed and manually deployed; its local test and audit numbers must not be assumed to describe the public app. The Bitnob sandbox report says no real Lightning invoice settlement was achieved through Bitnob and distinguishes builder-generated events from Bitnob settlement. Public deployment and current source therefore need a fresh verification before a judge treats screenshots as production evidence.

**Criterion view:** high-impact, technically ambitious, but the pitch needs a much narrower demonstrable journey and a clean commit/deployment evidence chain.

### 5.7 Jaay — `sachinsivapragash/jaay`
**Product:** CFA-first POS and credit book for market sellers. On-chain Signet QR payments, NWC invoice reception, WhatsApp reminder/receipt, Nostr encrypted ledger backup, note parsing and sales reports.

**What the code supports:** BIP39/BIP84 wallet with @scure, local signed transactions, PIN encryption (PBKDF2 310k + AES-GCM), NWC NIP-47 with NIP-04, Esplora, pay-link parser, offline sale/credit parser, encrypted Nostr backup, formula-safe CSV. README says 27 tests; `SUBMISSION.md` appears to count 30, so the repository's own test number is inconsistent.

**Judge strengths:** excellent local merchant persona and direct fit to day-to-day work; WhatsApp reminder and credit book are culturally/operationally specific; the product handles cash rather than pretending all payments are Bitcoin.

**Judge caveats:** payment page declares a payment complete at 98% of invoice amount, which risks treating a short payment as paid. NWC URI is stored in local browser storage; the seed vault is encrypted, but the NWC delegation string is a separate secret. No successful live external NWC payment was evidenced. PWA is testnet-only.

**Criterion view:** excellent user story, credible wallet core, but settlement accounting and secret-storage choices should be hardened before real merchants depend on it.

### 5.8 Natt — `shineyrbl-byte/natt`
**Product:** rotating savings circles/tontines in Wolof/French/English, with Lightning contributions, random payout order, Nostr chained receipts, reminders and a no-tool AI helper.

**What the code supports:** 128-bit member tokens stored as hashes and constant-time comparison; cryptographic Fisher–Yates draw; unique member contribution per round; signed Nostr kind-1 event ledger chained by previous event; LNbits and simulated adapters; strict schemas; private phone visibility only to organizer; Lightning address resolver blocks obvious local/private host forms. Test suite covers full tontine simulation and access/ledger checks.

**Judge strengths:** high local cultural relevance, small PWA, transparent contribution receipt and strong demo narrative. AI is not allowed to move funds.

**Judge caveats:** README says the public GitHub Pages demo is simulated and the hosted Fly.io trial was available only until 16 Nov 2026; the accessible full server path requires local setup and LNbits configuration. The pot is held in the group's LNbits wallet, which the threat model calls custodial. A material retry edge case exists: `claimPayout()` moves `collecting → paying`, but on any `wallet.payInvoice()` error it resets to `collecting`; a timeout may occur after the wallet accepted the payment, so a retry could attempt a duplicate payout. Unknown must be reconciled by hash before retry, not reset as an ordinary failure.

**Criterion view:** strong local problem and UX; security score is pulled down by custody and the ambiguous-payment retry path.

### 5.9 CircleSats — `0xNexuz/circlesats`
**Product:** tontine with member contributions, approvals for a payout, rotating schedule and receive-only treasurer wallet.

**What the code supports:** versioned/checksummed JSON ledger; atomic file write/backup; CSRF/member access controls; NWC receiver requires `make_invoice` and `lookup_invoice`, pins network and wallet public key, rejects spending permissions in ordinary receive mode, checks invoice hash/amount/state and optional preimage. Evidence documents one 100-sat Mutinynet payment on 27 October, with the same hash/preimage verified.

**Judge strengths:** a real incoming Lightning test payment was recorded with reproducible invoice/preimage details. Clear separation between pending and settled contributions. The product is local and intuitive.

**Judge caveats:** `docs/DEPLOYMENT_READINESS.md` states the public Vercel app is a simulated, per-browser experience; the full Node app is local. The live Mutinynet proof is a real Lightning payment but test coins and the Mutinynet faucet payer, not a paying judge or customer. Outgoing payout execution is intentionally disabled: approval is a record, and settlement can be marked simulated or a manual payment claim can be recorded unverified. The docs explicitly say no outgoing payout has been verified.

**Criterion view:** good receive-side evidence and credible architecture, but the core savings-circle promise is not complete until actual payout is safely executed and reconciled.

### 5.10 SmartPay Africa — `Merveil-ATIPOT/smartpay-africa`
**Product:** mobile wallet education and payments, with an additional simulated cross-border-transfer workflow and merchant/admin modules.

**What the code supports:** Expo/React Native + Django + PostgreSQL + Bitcoin Core/LND Alice/Bob Regtest. Payment creation requires explicit confirmation and idempotency; settlement is marked only after LND lookup. API and mobile tests cover ownership/payment states. README describes 181 API tests and 169 mobile tests, not rerun here.

**Judge strengths:** clear labeling of Regtest, mock and simulated flows; a working local Android payment demo; Academy content; a credible Docker lab.

**Judge caveats:** one shared Alice node provides the displayed balance to all users; users do not have independent wallets. Mobile transfer quote/preparation uses a fictitious FCFA/BTC rate, mobile app does not call confirm, and no Wave/Orange/MTN API is connected. Merchant QR is local/in-memory. README says no hosted app/API was deployed for the hackathon.

**Criterion view:** an honest engineering demo with a broad but unfinished product. A judge may struggle to see one clear product in the combined app.

### 5.11 KudiWallet — `jozzy001mail/kudiwallet`
**Product:** self-custodial Bitcoin testnet wallet for everyday African payments, naira-localized; create/import seed, balance/history, send testnet BTC, produce/inspect Lightning invoices.

**What the code supports:** pure browser BIP39/BIP32/BIP84, P2WPKH transaction serialization/signing, mempool.space testnet balance and broadcast, BOLT11 creation with a node private key, BOLT11 signature recovery/verification. Tests cross-check core vectors using bitcoinjs-lib and bolt11. Public test wallet phrase is intentionally published for judges and is clearly test-only.

**Judge strengths:** the most tangible self-custodial on-chain wallet implementation among simple wallet entries; real testnet send path and clear code. The Lightning encoder is genuinely signing invoices; it is not the SatsFlow-style stub.

**Judge caveats:** README and demo script state Lightning settlement is simulated because there is no Lightning node. The passphrase vault uses 100,000 PBKDF2 iterations. The public sample recovery phrase must never be funded with real money. No Lightning payment/receipt was shown.

**Criterion view:** satisfies a Bitcoin wallet path, but its local commercial job is more general and Lightning part is explicitly incomplete.

### 5.12 SatsFlow — `jeffrey-graham/dakar-satsflow-lightning`
**Product claim:** L402 API gating, invoice validation, route selection, MPP and USSD/SMS vouchers for low-connectivity corridors.

**What the code actually supports:** a short Python engine and client-side demonstration UI; README itself says route topology is offline simulation and hosted UI is client-side simulation. The BOLT11 encoder creates checksum-valid invoice strings but uses a deterministic/HMAC-style signature stub rather than an ECDSA secp256k1 node signature. The decoder checks Bech32 checksum but not the full invoice signature. L402 demo exposes the supposed settled preimage in the public challenge response; `verify_l402_token` then accepts it, so no external payment is required. Route graph/capacities/fees are fixed fixtures; MPP splitting is a simplified approximation. Offline voucher uses a hard-coded shared HMAC secret and short tag; no expiry/replay store/SMS gateway is implemented. FX rates and corridor fees are hard-coded and route label remains a fixed corridor.

**Judge strengths:** problems chosen (low connectivity, micro-payments) could be valuable, and the README has become more honest about simulation.

**Judge caveats:** the Devpost framing describes something much closer to an operating protocol than this code implements. It should not be treated as a working wallet, real L402 service or real invoice protocol integration. The wallet gate is not satisfied by a fake invoice encoder.

**Criterion view:** interesting prototype for discussion, not a defensible “working MVP” yet.

### 5.13 SatsGuard AI — `amazing200guy1-a11y/satsguard-ai`
**Product claim:** multilingual AI/NWC copilot, fee-safety gate, offline signed vouchers and spending circuit-breaker.

**What the code actually supports:** regex-based intent extraction and a deterministic fee comparison using a passed-in “proposed route fee”; a mock `NostrWalletConnectClient` that returns a synthetic SETTLED response and a hash-derived pseudo-preimage without opening a Nostr relay or validating a wallet signature; a fixed class-level HMAC voucher secret. The “offline voucher” uses an 8-byte nonce and 16 hex characters of HMAC, lacks expiry enforcement and replay tracking, and is not a Bitcoin payment. Orchestrator creates a fake invoice string (`lnbc...`) and marks its own telemetry settled after the mock response. Dashboard is a presentation layer for these synthetic metrics.

**Judge strengths:** the targeted issues—fee surprise, invoice safety and weak connectivity—are relevant.

**Judge caveats:** the core NWC and settlement are stubs; a shared secret is embedded in source; the advertised non-custodial/settled status does not follow from protocol interaction. Ten passing tests are unit tests of the synthetic engine, not integration tests with a Lightning wallet.

**Criterion view:** low evidence for MVP or security claims until a real NWC client, valid BOLT11 parsing, real payment lookup and anti-replay voucher design are implemented.

### 5.14 CarbonLens — `shikhon-rahaman/carbonlens`
**Product:** geospatial vegetation evidence review and an Ethereum Sepolia registry for environmental project claims.

**What the code supports:** Next.js + FastAPI + Planetary Computer Sentinel-2 path, cached NDVI fallback, Shapely geometry checks, score model, Solidity ERC-1155 registry and duplicate cells. Contract has OpenZeppelin role control, pause and reentrancy guard. The API verifier key is privileged and server-side.

**Judge strengths:** coherent and responsible scope disclosure: NDVI is not carbon measurement, credits are test artifacts, verifier is trusted and overlap checks can be evaded. Strong technical docs.

**Judge caveats:** does not implement Bitcoin/Lightning; Sepolia/Ethereum-only fails the published wallet requirement. The score is an NDVI heuristic, not an auditable carbon estimate. The README and `SECURITY_REPORT.md` report unresolved web dependency advisories and no third-party audit. Demo samples use cached data, not live satellite readings.

**Criterion view:** relevant climate concept, but challenge fit and security posture are weaker than the Bitcoin-first field.

### 5.15 CryptPilot — `madhavzanwar/crypt-pilot`
**Product:** personal finance forecast/copilot merged with an on-chain wallet risk checker using graph analytics and XGBoost.

**What the code supports:** large Next.js/FastAPI service; financial account and budget features; address validation; graph query engines; model scoring; explanation validation; credits/testnet billing; EAS attestation on Base Sepolia. Firebase auth fixes historical IDOR. Chain analyst abstains if no wallet evidence.

**Judge strengths:** rich documentation, broad tests and multiple thoughtful guardrails (e.g. explanation numbers must be grounded, dangerous seed/private-key strings rejected).

**Judge caveats:** `crypto-service/app/services/DECISIONS.md` records that Elliptic++ source data could not be downloaded during build; core pipeline was exercised against synthetic fixtures. No real model metric or graph count should be assumed. TigerGraph was suspended; NetworkX requires roughly 2 GB for the full graph. Payment rails are test-only and no meaningful Bitcoin/Lightning wallet implementation was found. The monorepo includes multiple products and old feature docs that refer to removed flows.

**Criterion view:** ambitious and well-documented, but feature scope/data provenance undermine a “working, trustworthy financial risk MVP”; wallet gate appears unmet.

### 5.16 SubZero Vault — `draarivpatel-ui/subzero-vault`
**Product:** self-hosted reading/bookmark/highlight vault plus subscription-cost calculator and Docker packaging studio.

**What the code supports:** vanilla JS, Python standard-library HTTP server, SQLite WAL, BM25, SM-2 review, Netscape bookmark HTML import/export, subscription math and self-hosted backups. Docs report 186 JS tests, 229 Python self-checks, a 132/150 mutation-test result and headless browser checks across viewport widths. Server supports optional bearer auth, origin allowlist and tokenized bookmarklet.

**Judge strengths:** unusually careful tests and product polish; project explains price assumptions and limitations.

**Judge caveats:** README says it is a reference build rather than a CloudFALL program submission because Hackatime/Lapse time wasn't tracked. It has no Bitcoin or Lightning implementation and does not solve the hackathon's target problem.

**Criterion view:** good software, poor challenge fit; wallet gate fails.

## 6. Claim-only projects: no canonical source repo could be audited

These projects were on the accessible gallery/indexed submission record, but I could not establish a canonical public source repository from the Devpost page/search results. Their scores are pitch-only and intentionally low-confidence.

- **Twese:** unusually strong savings-circle concept: hold invoices, refund on failed round, wallet-connected flow. Devpost says payments are sandbox sats. Without source code, I cannot verify hold-invoice state transitions, preimage safety, expiry logic or double-settlement handling. The concept could rank near the top if its code matches its pitch.
- **KOLA:** Lightning tontine with group contributions and hold invoices; concept is relevant, but there is no verifiable repository in the accessible result.
- **SunuSats:** French-first Lightning companion for Senegalese merchants and NWC. Writeup admits offline demo payments are simulated and real-money interoperability not verified. Code and threat model unavailable for independent review.
- **AFRISWIFT:** regional cross-border transfer experience; Devpost writeup describes a simulated fiat ledger. No canonical code repository was available to verify FX, liquidity, settlement, or mobile-money payout.
- **Ojo POS:** POS with NWC, idempotent credits and ambiguous-payment controls in its writeup. No canonical repo was verified; those are claims, not inspected properties.
- **Connect:** browser extension for Nostr/Lightning/Cashu onboarding. Devpost says unpacked desktop preview, not mainnet product. Canonical code repository wasn't retrievable from its public page in this review.

These entries may be more complete than this report can establish; the correct conclusion is **unverified**, not “bad code”.

## 7. Cross-project takeaways for judges

### What is genuinely strong in this field

1. **Local-first merchant workflows:** Caisse Teranga, Jaay and SamaBoutik begin with the till, stock, receipt and ledger rather than the crypto wallet alone.
2. **Payment certainty:** GreyFinance, FlashDrop, Caisse Teranga, SmartPay and CircleSats understand that an HTTP 200 or a client-side green check is not settlement.
3. **Careful limits disclosure:** SatsClass, CarbonLens, FlashDrop, CircleSats, Caisse Teranga and NobPay have useful security/limitation documents.
4. **Non-custodial or scoped wallet integration:** NWC receive-only connections and client-side signing are used by several stronger entries.
5. **A working local demo beats a static mockup:** FlashDrop and SatsClass have particularly clear repeatable local environments; CircleSats and others have real test-network evidence even where the public UI is simulated.

### Repeated gaps

- Public demos are often simulation-first, while the more meaningful code paths run only on a developer machine.
- Most cash-out/mobile-money integrations are simulated; “mobile money support” often means a UI option, not a verified payment provider.
- “Offline” frequently means cached UI, a voucher format or deferred sync—not a complete offline-safe payment settlement model.
- NWC is often claimed without proving permissions, signature, amount, payment hash, preimage and uncertain-payment reconciliation end to end.
- A local test network demonstrates protocol behavior; it does not demonstrate merchant adoption, production liquidity or regulatory readiness.
- Some repositories are large and feature-rich but do not have one unmistakable primary user or one decisive workflow.

## 8. Recommended judge ranking bands

**Band A — strong contender on code evidence:** Caisse Teranga, SatsClass, FlashDrop, GreyFinance, SamaBoutik.

**Band B — high potential with material caveats:** NobPay, Jaay, CircleSats, Natt, SmartPay Africa, KudiWallet.

**Band C — useful prototypes, but wallet/production/data gaps:** CryptPilot, CarbonLens, SubZero Vault.

**Band D — not yet a defensible working protocol MVP in inspected code:** SatsFlow, SatsGuard AI.

**Unranked until source verification:** Twese, KOLA, SunuSats, AFRISWIFT, Ojo POS, Connect.

A different jury could rank the bands differently depending on how it interprets local impact versus protocol depth; the criteria do not publish weights.

## 9. Sources and audit boundary

Primary hackathon sources: [Devpost overview](https://dakar-bitcoin-hack-2026.devpost.com/), [rules](https://dakar-bitcoin-hack-2026.devpost.com/rules), [project gallery](https://dakar-bitcoin-hack-2026.devpost.com/project-gallery), [resources](https://dakar-bitcoin-hack-2026.devpost.com/resources).

Repositories inspected:

- [Caisse Teranga](https://github.com/Binetuuu/caisse-teranga-)
- [GreyFinance](https://github.com/greyw0rks/grey-payroll)
- [FlashDrop](https://github.com/thecosmos42/flashdrop)
- [SatsClass](https://github.com/thesithunyein/satsclass)
- [SamaBoutik app](https://github.com/Faith-time/samaboutik-app) and [API](https://github.com/Faith-time/samaboutik-api)
- [NobPay](https://github.com/mouhaa-md/NobPay)
- [Jaay](https://github.com/sachinsivapragash/jaay)
- [Natt](https://github.com/shineyrbl-byte/natt)
- [CircleSats](https://github.com/0xNexuz/circlesats)
- [SmartPay Africa](https://github.com/Merveil-ATIPOT/smartpay-africa)
- [KudiWallet](https://github.com/jozzy001mail/kudiwallet)
- [SatsFlow](https://github.com/jeffrey-graham/dakar-satsflow-lightning)
- [SatsGuard AI](https://github.com/amazing200guy1-a11y/satsguard-ai)
- [CarbonLens](https://github.com/shikhon-rahaman/carbonlens)
- [CryptPilot](https://github.com/madhavzanwar/crypt-pilot)
- [SubZero Vault](https://github.com/draarivpatel-ui/subzero-vault)

**Limitations:** this is a public-source desk audit, not a penetration test, formal security audit, legal opinion, or independent reproducibility run. I inspected READMEs, available architecture/security/limitation docs, test inventories and the core code paths that handle wallet creation, invoices, payment settlement, authorization, custody and state transitions. In large monorepos, generated files, styling/assets, lockfiles and every unrelated module were not read line by line. Tests, deployments and screenshots described by maintainers remain attributed claims unless corroborated by repository evidence. The scores reflect the snapshot and information available on 19 November 2026.
