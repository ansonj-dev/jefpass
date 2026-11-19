# JëfPass Project Brief

## One sentence

JëfPass is a portable work passport for independent technicians that records agreed service scope, customer acknowledgement and Lightning payment evidence as separate facts.

## User and problem hypothesis

The initial user is an independent phone, laptop or small-appliance repair technician in Dakar. The hypothesis is that informal workers may rely on fragmented chat messages, paper notes and separate payment apps, making it difficult to carry consistent job and payment records between customers.

This is a hypothesis requiring interviews. Labour-market statistics provide context but do not prove this exact problem or demonstrate demand. No customer interviews, technician interviews or measured pilot are claimed in the current evidence.

## Core workflow

1. Worker creates a repair quote with scope, category, amount and due date.
2. Customer opens an expiring link and signs acceptance of the exact scope without creating an account.
3. Worker records completion.
4. Customer signs acknowledgement or dispute.
5. Worker requests an incoming Lightning invoice from a dedicated receive-only NWC connection.
6. Customer pays from a separate wallet.
7. Server reconciles the original invoice and checks the exact amount, payment hash and matching preimage.
8. JëfPass issues an immutable receipt snapshot and provides a public verifier and private export.

## Protocol roles

- Bitcoin Lightning: payment request and wallet-reported settlement evidence.
- NWC: permission-scoped access to the receiving wallet.
- Nostr: signed customer action proofs and optional worker receipt commitment.
- SHA-256 and Ed25519: receipt integrity and issuer signature.
- AI: optional reviewed job-description drafting only.
- IndexedDB: non-financial drafts that synchronize later.

Customer proofs use JëfPass ephemeral kind 27236. NIP-98 reserves kind 27235 for HTTP authentication. Worker receipt commitments use kind 30078 and are published only after external NIP-07 signing.

## What is implemented

- Account registration and login.
- Worker profile and bilingual English/French interface.
- Job creation, expiring customer links and signed customer actions.
- Server-side ownership and invoice-state guards.
- Receive-only NWC adapter and BOLT11 validation.
- Durable invoice reservation and conservative UNKNOWN handling.
- Worker-bound encrypted NWC credential envelopes with legacy read compatibility.
- Ed25519 receipt issuer signatures, public verifier and private bundle verifier.
- Worker signer public-key binding for receipt attachments.
- Opt-in public passport and optional worker Nostr commitment event.
- Offline non-financial job drafts and deduplicated sync.
- Optional AI draft endpoint with local fallback.

## Evidence and honest boundaries

- GitHub Actions on main has passed 128 automated tests across 9 test files, typecheck, production build and the configured production-dependency audit gate.
- A locally exercised unpaid worker-to-customer-to-receipt browser journey is documented in VERIFICATION.md.
- Automated tests exercise signatures, state transitions, invoice validation and mocked wallet-response handling.
- The recorded verification evidence reports zero genuine external wallet settlements.
- NIP-07 external signer and relay publication remain unexercised in the recorded evidence.
- No user interviews, adoption metrics or field pilot are claimed.
- Public verifier checks installation-key consistency; it does not query a live wallet or independently establish issuer identity.
- The receipt does not prove repair quality or legal identity.

## Judging criteria alignment

| Criterion | Implemented evidence | Remaining validation |
|---|---|---|
| Usefulness and local impact | Specific technician workflow and customer confirmation | Consented interviews and measured pilot |
| Security by design | Receive-only NWC adapter, scoped signatures, worker-bound credential encryption, request guards and safe UNKNOWN handling | Independent review, live wallet and crash/recovery drills |
| UX/UI | English/French interface, customer QR flow, mobile-first layout, separate service/payment states | Physical devices, accessibility review and low-bandwidth tests |
| Working MVP | Account-to-quote-to-customer-to-unpaid-receipt journey and a tested wallet adapter | Genuine external Lightning wallet settlement and independently checkable payment evidence |
| Pitch and docs | README, architecture, threat model, demo guide, limitations and verification report | Final demo recording and user-validation evidence |

The Bitcoin/Lightning wallet requirement is separate from criterion scoring. Adapter fixtures do not satisfy the external payment demonstration.

## Measurement and non-goals

No market size, user reach, payment volume or adoption metrics are invented. Record measured outcomes from a supervised pilot before including numbers.

No marketplace, escrow, lending, public rating, credit score, token, exchange, fiat cash-out, mobile-money settlement, identity certification or automated spending agent is part of this MVP.
