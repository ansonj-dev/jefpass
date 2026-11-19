# Dakar Bitcoin Hack 2026 — Builder Resource & Technical Reference

**Purpose:** A practical resource map for researching, selecting and integrating the technologies listed on the official Dakar Bitcoin Hack 2026 resources page.  
**Official hackathon:** https://dakar-bitcoin-hack-2026.devpost.com/  
**Official resources page:** https://dakar-bitcoin-hack-2026.devpost.com/resources  
**Prepared:** 19 November 2026

> This document is intended to be used as a project-building reference by developers and coding agents. It is not a requirement to use every listed technology. Select only the tools that directly support the product's core user workflow.

---

## 1. How to use this document

The hackathon expects practical solutions for local and regional needs, built around Bitcoin, Lightning, Nostr and AI. Use this guide in this order:

1. Define the user and the real-world problem.
2. Select the smallest protocol/tool set that solves the problem.
3. Read the official documentation for the selected tools.
4. Build and test the smallest end-to-end workflow.
5. Document what is real, simulated, testnet-only or still planned.
6. Publish a reproducible project with setup instructions and a public repository.

**Do not integrate every technology just because it appears on the resources page.** A focused MVP using one wallet implementation, one payment or identity flow, and a clear user experience is usually more reliable than a large collection of incomplete integrations.

---

## 2. Official resources page — technology list

The hackathon resources page names these tools and technologies:

- Bitcoin Core
- Bitcoin Dev Kit (BDK)
- BTCPay Server
- Electrum server
- Lightning Dev Kit (LDK)
- Fulcrum server
- Lightning Core / Core Lightning
- C-Lightning
- USSD
- LNURLPoS
- mempool.space
- Mobile Money APIs
- Sparrow Wallet
- Nostr
- Nostr Wallet Connect (NWC)
- AI

The page also links the hackathon support channels:
- Discord: https://discord.gg/tyS2Mt7C
- Telegram: https://t.me/+QArsWD3suKE2Yjg0
- X: https://x.com/dakarbtcdays

**Naming note:** “Lightning Core” and “C-Lightning” are older/common naming references for **Core Lightning (CLN)**. Treat Core Lightning as one implementation rather than assuming these are two separate stacks.

---

# 3. Bitcoin foundation

## 3.1 Bitcoin Core

**What it is**

Bitcoin Core is a full-node implementation. It validates blocks and transactions, maintains the node's view of the chain, and exposes interfaces such as JSON-RPC for applications and developer tools.

**Official resources**
- Website: https://bitcoincore.org/
- Developer documentation: https://developer.bitcoin.org/
- Developer guide: https://developer.bitcoin.org/devguide/
- Developer reference / RPC reference: https://developer.bitcoin.org/reference/
- Bitcoin Core repository: https://github.com/bitcoin/bitcoin
- Core documentation directory: https://github.com/bitcoin/bitcoin/tree/master/doc

**Use it when**
- You need your own Bitcoin node.
- You need to create or inspect on-chain transactions.
- You need a local Regtest environment.
- You are developing wallet, payment, explorer or Lightning infrastructure that needs chain data.

**Typical MVP use**
- Run Bitcoin Core in Regtest.
- Create a wallet and generate test addresses.
- Mine local blocks to fund test transactions.
- Use `bitcoin-cli` or JSON-RPC to inspect wallet/transaction state.
- Connect another component, such as a Lightning node or Electrum server, to the node.

**Important concepts**
- Mainnet: real BTC and real economic value.
- Testnet/Signet: public test networks with test coins.
- Regtest: local private testing network where blocks can be generated on demand.
- RPC: authenticated interface for local/server-side application integration.
- `txid`: transaction identifier; it does not alone prove confirmation.
- Confirmations: blocks added after a transaction is included.

**Security**
- Never expose Bitcoin Core RPC directly to the public internet.
- Use strong RPC credentials or cookie authentication where appropriate.
- Restrict RPC access to trusted services.
- Do not put wallet seeds, RPC credentials or private keys in frontend code or Git.
- Use Regtest for repeatable demos; clearly label it as local test money.

**Recommended reading:** Start with the developer guide and RPC reference before attempting custom transaction construction.

---

## 3.2 Bitcoin Dev Kit (BDK)

**What it is**

BDK is a collection of libraries for building Bitcoin wallet functionality. It provides wallet building blocks rather than requiring an application to implement every wallet primitive from scratch.

**Official resources**
- Project website: https://bitcoindevkit.org/
- Documentation: https://docs.rs/bdk_wallet/latest/bdk_wallet/
- GitHub organization: https://github.com/bitcoindevkit
- Main repository: https://github.com/bitcoindevkit/bdk

**Use it when**
- Your application needs an on-chain Bitcoin wallet.
- You need wallet creation, descriptors, address generation, balance/history and transaction construction.
- You want wallet functionality embedded into your own product rather than relying only on an external wallet UI.

**Typical MVP use**
- Create or import a test wallet.
- Derive a receive address.
- Sync wallet data through a supported chain source.
- Display balance and transaction history.
- Construct and sign a test transaction in a controlled environment.

**Choose BDK if**
- The project needs an embedded on-chain wallet.
- The team is comfortable with Rust or a supported language binding.
- The wallet is an actual product feature, not merely a payment button.

**Do not choose BDK just because the hackathon lists it.** If your MVP only needs to connect to an existing Lightning wallet, NWC may be a simpler fit.

---

## 3.3 BTCPay Server

**What it is**

BTCPay Server is a self-hosted payment processor for accepting Bitcoin payments. It provides invoices, payment status, point-of-sale capabilities and integration APIs.

**Official resources**
- Documentation: https://docs.btcpayserver.org/
- Developer documentation: https://docs.btcpayserver.org/Development/
- Greenfield API: https://docs.btcpayserver.org/Development/Greenfield/
- GitHub: https://github.com/btcpayserver/btcpayserver

**Use it when**
- You are building a merchant checkout or payment acceptance flow.
- You need invoice creation and payment status without implementing every payment-processing component yourself.
- You want a self-hosted alternative to a centralized payment processor.

**Typical MVP use**
1. Deploy or connect to a BTCPay Server instance.
2. Configure a test wallet/network appropriate to the demo.
3. Create an invoice from your backend.
4. Show the invoice or QR code to the customer.
5. Receive a webhook or query invoice status.
6. Update the merchant order only after verifying the payment state.

**Important implementation notes**
- Verify webhook signatures according to the documentation.
- Treat payment notifications as untrusted until validated.
- Handle `new`, `processing`, `settled`, `expired` and other relevant states correctly.
- Make invoice creation idempotent to avoid duplicate orders.
- Never mark an order paid merely because a browser redirected to a success page.

**Best fit:** merchant POS, online checkout, donations and simple payment collection.

---

# 4. Bitcoin wallet data and Electrum infrastructure

## 4.1 Electrum server / Electrum protocol

**What it is**

The Electrum protocol is a client-server JSON-RPC protocol commonly used by lightweight self-custodial Bitcoin wallets to obtain address history, UTXOs, transaction and block-header information without every wallet running a full node.

**Resources**
- Protocol documentation: https://electrum-protocol.readthedocs.io/en/latest/
- Electrum wallet: https://electrum.org/
- Electrum source: https://github.com/spesmilo/electrum

**Use it when**
- Your wallet needs to query blockchain data through an Electrum-compatible server.
- You need lightweight wallet synchronization.
- You are building wallet infrastructure and want to understand the client/server protocol.

**Typical MVP use**
- Connect a test wallet to a trusted Electrum-compatible server.
- Query script/address status and transaction history.
- Subscribe to status changes where supported.
- Verify that the wallet's displayed state matches the server response.

**Security and privacy**
- An Electrum server can learn which scripts/addresses a client queries.
- Use a server you operate or trust.
- Use TLS for remote connections.
- Do not treat a server response as a substitute for independent validation where stronger trust minimization is required.

---

## 4.2 Fulcrum

**What it is**

Fulcrum is an Electrum-compatible SPV server for Bitcoin and other supported chains. It indexes chain data from a full node and serves Electrum protocol requests to lightweight wallets.

**Official resources**
- Project website: https://fulcrumserver.org/
- GitHub: https://github.com/cculianu/Fulcrum
- README / setup notes: https://github.com/cculianu/Fulcrum/blob/master/README.md
- Manual: https://github.com/cculianu/Fulcrum/blob/master/doc/unix-man-page.md

**Use it when**
- You want to operate your own Electrum server.
- You need a private backend for wallet history/synchronization.
- Your application needs an Electrum-compatible data source and you have the infrastructure to operate it.

**Typical architecture**
`Bitcoin Core node → Fulcrum index/server → wallet or BDK Electrum client`

**Important**
- Fulcrum is infrastructure, not a wallet UI.
- It needs a compatible full node and disk/storage capacity.
- It is probably unnecessary for a short hackathon MVP unless private wallet indexing is a core feature.
- Follow the current official setup instructions and verify downloaded binaries.

---

# 5. Lightning Network

## 5.1 Lightning Dev Kit (LDK)

**What it is**

LDK is a flexible Lightning implementation packaged as a software development kit. It lets developers build Lightning functionality into custom applications and control choices such as chain data, networking, persistence and key management.

**Official resources**
- Website: https://lightningdevkit.org/
- Introduction: https://lightningdevkit.org/introduction/
- Documentation: https://lightningdevkit.org/
- GitHub: https://github.com/lightningdevkit/rust-lightning
- LDK Node: https://github.com/lightningdevkit/ldk-node

**Use it when**
- You want to build a Lightning wallet or node into your application.
- You need deeper control over Lightning behavior.
- You are building a mobile wallet, custom payment experience or Lightning infrastructure.

**Typical MVP use**
- Start from the LDK Node or sample-node documentation.
- Use a suitable development network.
- Create/restore a test wallet.
- Generate a Lightning invoice.
- Pay an invoice and display the result.
- Test failure, timeout and reconnect behavior.

**Trade-off**
LDK gives flexibility, but it also gives the project more responsibility for configuration, persistence, networking and key management. For a short MVP, NWC or an existing Lightning service may be faster if the product does not require a custom node.

---

## 5.2 Core Lightning (CLN) / C-Lightning

**What it is**

Core Lightning is an open-source Lightning Network implementation. It provides a node, APIs, plugins and developer tools for building Lightning applications.

**Official resources**
- Documentation portal: https://docs.corelightning.org/docs/home
- Developer app development: https://docs.corelightning.org/docs/developers
- API reference: https://docs.corelightning.org/reference
- GitHub: https://github.com/ElementsProject/lightning

**Use it when**
- You need to operate a Lightning node.
- You need programmatic invoice creation and payment execution.
- You want to build a plugin or server-side Lightning application.
- Your product requires control over node behavior.

**Typical MVP flow**
1. Start CLN on a development network.
2. Create or connect a wallet/node.
3. Generate an invoice with the appropriate RPC/API.
4. Pay it from a separate test wallet.
5. Listen for or query the payment result.
6. Persist a payment record in your application database.

**Important**
- A Lightning invoice is not the same as a completed payment.
- Handle pending, failed, expired and settled states.
- Protect the node's RPC socket/API and credentials.
- Never expose unrestricted node RPC to a browser.
- Use a separate test environment and small test amounts.

**CLN vs LDK**
- CLN is a node implementation with an established API/plugin model.
- LDK is a toolkit for embedding/customizing Lightning functionality.
- Pick one based on whether you need an operated node or a custom embedded implementation.

---

# 6. LNURLPoS and Lightning payment UX

## 6.1 LNURL and LNURLPoS

**What it is**

LNURL is a family of Lightning interaction patterns built around web-accessible endpoints and encoded links/QR codes. LNURLPoS is a point-of-sale-oriented implementation using LNURL-pay patterns.

**Official protocol resources**
- LNURL specifications (LUDs): https://github.com/lnurl/luds
- LNURLPoS entry in the LUD ecosystem: https://github.com/lnurl/luds#self-hosted
- LNURL base specification: https://github.com/lnurl/luds/blob/luds/01.md
- LNURL-pay specification: https://github.com/lnurl/luds/blob/luds/06.md
- LNURL success actions: https://github.com/lnurl/luds/blob/luds/09.md

**Use it when**
- A merchant needs a reusable QR code or payment entry point.
- A checkout flow needs a dynamic amount/description.
- A POS device should request a Lightning payment without exposing wallet internals.

**Typical merchant flow**
1. Merchant enters the amount.
2. Backend creates or exposes a valid LNURL-pay request.
3. Customer scans the QR code.
4. Wallet retrieves payment details.
5. Wallet creates and pays a Lightning invoice.
6. Merchant backend verifies payment and updates the sale.

**Important**
- LNURL is a protocol family; not every wallet supports every LUD.
- Check compatibility with the wallets used in your demo.
- Do not invent a custom LNURL response and assume wallets will accept it.
- Use a library or established implementation where possible.
- A static QR is not automatically a proof of payment; verify the callback/payment result.

---

# 7. USSD and low-connectivity access

## 7.1 USSD

**What it is**

USSD (Unstructured Supplementary Service Data) is a mobile-network session mechanism commonly used for interactive menu-based services. It can be useful for feature-phone users or environments where a lightweight text interaction is more practical than a smartphone app.

The hackathon lists USSD as a technology, but does not prescribe a specific USSD provider. Provider APIs, operator availability, registration, short codes and pricing vary by country.

**Example developer resource**
- Africa's Talking developer portal: https://developers.africastalking.com/
- USSD documentation section: https://developers.africastalking.com/docs/ussd/overview

**Use it when**
- The target users may not have smartphones or reliable mobile data.
- A short menu-based workflow is sufficient.
- You have access to a provider/operator sandbox or test code.

**Possible Lightning-related flow**
- User dials a USSD code.
- Backend identifies the session and presents a menu.
- User selects an action and enters a small amount or recipient.
- Backend creates a payment request or wallet action.
- User confirms through a secure, explicit mechanism.
- Backend returns the current status.

**Security warning**
USSD session identity is not a Bitcoin wallet signature. Do not treat a phone number or USSD session as proof of authorization to spend funds. High-risk payment actions require explicit wallet authorization and a carefully designed authentication model.

**MVP recommendation**
If operator access is not available, demonstrate the menu flow with a clearly labelled simulator. Do not claim production USSD connectivity unless an actual provider/operator integration is working.

---

# 8. Bitcoin network data and explorer APIs

## 8.1 mempool.space

**What it is**

mempool.space is an open-source Bitcoin explorer and provides REST APIs for querying public Bitcoin network data, transactions, blocks, addresses and selected Lightning network statistics.

**Official resources**
- Website: https://mempool.space/
- API documentation: https://mempool.space/docs/api/rest
- GitHub: https://github.com/mempool/mempool

**Useful API examples**

Get the current Bitcoin tip height:

```http
GET https://mempool.space/api/blocks/tip/height
```

Get transaction details:

```http
GET https://mempool.space/api/tx/{txid}
```

Get transaction status:

```http
GET https://mempool.space/api/tx/{txid}/status
```

Validate a Bitcoin address:

```http
GET https://mempool.space/api/v1/validate-address/{address}
```

Get recent blocks:

```http
GET https://mempool.space/api/blocks
```

Get current price data:

```http
GET https://mempool.space/api/v1/prices
```

**Use it when**
- You want to display on-chain transaction status.
- You need public blockchain explorer data.
- You want to link a transaction to a public explorer.
- You want to show network information in a wallet or merchant dashboard.

**Limitations**
- Public API rate limits apply.
- Do not assume a public API is an unlimited production backend.
- Do not expose users' private wallet data unnecessarily.
- Public on-chain data does not prove a Lightning payment; Lightning payments generally do not appear as individual on-chain transactions.
- A transaction's existence in the mempool is not the same as confirmation.

**Recommended approach**
Use the API for non-critical explorer display or a demo. For critical wallet validation, use your own trusted node/wallet source and verify the correct network and confirmation/payment state.

---

# 9. Mobile Money APIs

## 9.1 What the hackathon means by Mobile Money APIs

Mobile Money APIs are provider-specific services that let applications initiate or verify fiat/mobile-money transactions. They are not one universal API. Available services, credentials, onboarding, fees, webhooks and supported countries depend on the provider.

For a Senegal-focused project, investigate the actual providers and merchant access requirements before designing a flow around them.

**Useful discovery resources**
- Orange Developer portal: https://developer.orange.com/
- Wave business site: https://www.wave.com/
- Senegal developer/API directory (third-party discovery resource): https://apps.orvlabs.com/en
- 221 Pay overview and docs (third-party payment integration service): https://apps.orvlabs.com/en

**Important classification**
- Orange Developer is an official Orange developer portal.
- Wave's public business site is not, by itself, proof that a public developer API is available to every hackathon participant.
- 221 Pay and UnitechPay are third-party integration services, not the official Wave or Orange APIs. Review their terms, fees, security, availability and merchant requirements before use.
- Do not present a third-party aggregator as an official provider API.

**Use it when**
- Your product needs to connect an existing local fiat/mobile-money workflow with Bitcoin/Lightning.
- A merchant wants to accept more than one payment rail.
- You are prototyping a fiat-to-Bitcoin or Bitcoin-to-fiat user journey.

**MVP design advice**
- Keep the payment rails separate in the architecture.
- Use provider webhooks or server-side status queries.
- Verify signatures and transaction references.
- Implement idempotency.
- Never trust a frontend redirect as proof of payment.
- Show the user which rail was used and whether the transaction is pending, successful or failed.
- Clearly label a mocked mobile-money leg.

**Regulatory and operational caution**
Fiat conversion, custody, remittance and payment processing may trigger licensing, KYC/AML, consumer-protection and provider contract obligations. A hackathon prototype should not imply that it is authorized to offer regulated services.

---

# 10. Sparrow Wallet

**What it is**

Sparrow is a desktop Bitcoin wallet focused on transparency, control and privacy. It is useful for developers to inspect wallet behavior, connect to Bitcoin Core or Electrum servers, and test on-chain transactions.

**Official resources**
- Website: https://www.sparrowwallet.com/
- Documentation: https://www.sparrowwallet.com/docs/
- Download: https://www.sparrowwallet.com/download/
- GitHub: https://github.com/sparrowwallet/sparrow

**Use it when**
- You need a desktop test wallet.
- You want to inspect addresses, UTXOs and transactions.
- You need to connect a wallet to Bitcoin Core or an Electrum server.
- You want to verify that your application's on-chain transaction is visible in a separate wallet.

**Typical MVP use**
- Create a dedicated test wallet.
- Connect it to Regtest/Testnet/Signet as appropriate.
- Receive test coins.
- Inspect transaction details.
- Compare the wallet view with your application view.

**Security**
- Do not import a real personal wallet into an experimental app.
- Do not share seed phrases or screenshots containing sensitive recovery material.
- Use a separate test wallet for demos.
- Verify network selection before sending any transaction.

Sparrow is primarily a wallet and testing tool; it is not a general-purpose backend API for a web app.

---

# 11. Nostr protocol

## 11.1 Nostr

**What it is**

Nostr is an open protocol for signed events distributed through relays. Users control cryptographic identities; clients publish signed events and query relays. Nostr is not one central social network or one hosted database.

**Official and technical resources**
- Nostr protocol site: https://nostr.com/
- Nostr Developer Guide: https://nostrcg.github.io/devguide/
- NIPs repository: https://github.com/nostr-protocol/nips
- NIP index: https://nips.nostr.com/
- JavaScript library (`nostr-tools`): https://github.com/nbd-wtf/nostr-tools
- Nostr Development Kit (NDK): https://github.com/nostr-dev-kit/ndk

**How it works**
1. A user has a public/private key identity.
2. The client constructs an event.
3. The event is signed by the user's signer.
4. The client sends the event to one or more relays.
5. Other clients query relays and verify event signatures.

**Use it when**
- You need portable user identity.
- You are building messaging or community features.
- You want users to publish or retrieve signed records.
- You want an interoperable identity or communication layer.

**NIPs worth understanding first**
- NIP-01: basic protocol flow and signed events.
- NIP-05: human-readable identifier mapping.
- NIP-07: browser extension signing interface.
- NIP-17: modern private direct messages.
- NIP-44: versioned encrypted payloads.
- NIP-46: remote signing.
- NIP-47: Nostr Wallet Connect.

Check the current NIP repository for status and implementation guidance. Do not blindly implement deprecated or unrecommended NIPs.

**Security**
- Do not ask users to paste their private key into your app.
- Use an external signer or a carefully designed key-management approach.
- Treat relays as untrusted storage/transport.
- Verify event signatures.
- Understand that public events are public.
- Encryption does not automatically hide all metadata.
- Build key backup and recovery into the UX if your app manages keys.

---

# 12. Nostr Wallet Connect (NWC)

**What it is**

NWC connects a Bitcoin/Lightning wallet to an application using Nostr-based communication. It is especially useful when an app needs to request wallet operations without holding the user's wallet seed phrase.

The core protocol is described by NIP-47.

**Official resources**
- NWC documentation: https://docs.nwc.dev/
- Getting started for apps/websites: https://docs.nwc.dev/bitcoin-apps-and-websites/getting-started
- NWC specification: https://docs.nwc.dev/contribute/specification
- NIP-47: https://github.com/nostr-protocol/nips/blob/master/47.md
- NWC optional extensions: https://github.com/nostr-wallet-connect/nwc

**Use it when**
- Your application needs to connect to an existing Lightning wallet.
- You want users to authorize payments through their wallet.
- You want to avoid storing wallet seed phrases in your app.
- You are building a merchant, donation, savings, tipping or AI-assisted wallet workflow.

**Typical MVP flow**
1. User chooses “Connect wallet”.
2. User scans/pastes an NWC connection URI from a compatible wallet.
3. Backend stores the connection secret securely (or uses an appropriately scoped client-side design).
4. App requests wallet information or creates an invoice.
5. For payments, app requests the wallet to pay an invoice.
6. App verifies the returned result and updates its own transaction record.

**Security rules**
- Treat an NWC URI as a secret credential.
- Never commit it to Git or expose it in browser logs.
- Request the minimum required permissions.
- Prefer spending budgets/limits when supported.
- Make payment requests explicit and visible to the user.
- Provide disconnect/revoke instructions.
- Handle timeouts and ambiguous results without blindly retrying a payment.
- Do not let an AI model spend funds without explicit authorization and deterministic safeguards.

**Important**
NWC is a wallet connection protocol, not a wallet itself. The user's wallet remains responsible for executing wallet operations according to its permissions.

---

# 13. AI integration

The hackathon lists AI as an enabling technology, not a specific vendor or model. Choose an AI provider based on availability, cost, language quality, latency, privacy and deployment constraints.

## 13.1 Good AI use cases in Bitcoin products

- Explain Bitcoin and Lightning concepts in simple language.
- Translate instructions into French or relevant local languages.
- Help users understand invoice/payment states.
- Assist merchants with natural-language sales summaries.
- Guide users through wallet onboarding and recovery education.
- Classify support questions and route them to the correct help flow.
- Explain fees and transaction data returned by trusted APIs.
- Help developers inspect logs and documentation.

## 13.2 AI should not be the authority for money movement

The AI model should not:
- Invent a payment status.
- Decide that an invoice is paid without wallet/node verification.
- Generate or hold private keys.
- Ask users to reveal seed phrases.
- Initiate spending without explicit user approval.
- Override wallet spending limits.
- Be the only validator for an address, invoice or transaction.

**Recommended architecture**

`User → AI assistant → typed tool/function request → application backend → wallet/node API → verified result → AI explanation`

The backend and wallet/node should validate and execute financial operations. The AI can interpret the user's intent and explain the result, but it must not replace deterministic checks.

## 13.3 AI developer documentation

Example official provider documentation:
- OpenAI API docs: https://developers.openai.com/api/docs
- Quickstart: https://developers.openai.com/api/docs/quickstart
- Tool/function calling: https://developers.openai.com/api/docs/guides/tools
- API reference: https://developers.openai.com/api/reference/overview/

Other providers may be suitable; this link is an example resource, not a hackathon requirement.

**AI implementation checklist**
- Use server-side API keys.
- Validate model output against a schema.
- Use allowlisted tools and strict argument validation.
- Keep wallet secrets out of model context.
- Log safely without sensitive user data.
- Provide a non-AI fallback for critical actions.
- Test hallucination and prompt-injection cases.
- Keep a human/user confirmation step for payments.

---

# 14. How to choose a stack for common hackathon project types

These are suggested combinations, not official prescriptions.

| Project type | Suggested resources | Why |
|---|---|---|
| Merchant POS | BTCPay Server or CLN + LNURLPoS + optional NWC | Payment invoices, wallet settlement and merchant status |
| Embedded on-chain wallet | BDK + Bitcoin Core or trusted Electrum/Esplora source | Wallet creation, sync and transaction operations |
| Lightning wallet app | NWC for fastest integration, LDK for custom node behavior | Connect to existing wallet or embed Lightning |
| Savings group / tontine | NWC or CLN + backend ledger + optional Nostr | Payment requests, contribution records and communication |
| Bitcoin learning app | Regtest/Signet + Sparrow + AI tutor | Safe hands-on wallet learning |
| Nostr messaging/community | Nostr + nostr-tools/NDK + signer | Portable identity and signed messaging |
| AI wallet assistant | NWC + AI API + deterministic payment backend | Explain and orchestrate wallet workflows safely |
| Blockchain explorer/dashboard | mempool.space API + optional Bitcoin Core | Transaction and block visibility |
| Low-connectivity financial tool | USSD provider + backend + wallet integration | Feature-phone interaction where operator access exists |
| Fiat/mobile-money bridge | Provider-specific Mobile Money API + Lightning integration | Complementary local payment rails; requires provider access |

---

# 15. Suggested architecture patterns

## 15.1 Merchant Lightning checkout

```text
Customer phone
    |
    | scan QR / approve invoice
    v
Merchant Web/PWA
    |
    v
Backend API
    |
    +---- Order database
    |
    +---- BTCPay Server / Core Lightning
                 |
                 v
            Lightning Network
                 |
                 v
        Verified payment status
                 |
                 v
        Merchant order marked paid
```

Key rule: only mark an order paid after verifying the server/wallet's authoritative payment state.

## 15.2 NWC-powered application

```text
User
 |
 v
Web or mobile app
 |
 v
Application backend
 |
 +---- Secure NWC connection storage
 |
 +---- Nostr relay transport
             |
             v
        User's Lightning wallet
             |
             v
        Payment result
             |
             v
        Backend verifies and records result
```

Key rule: an NWC connection URI is a credential. Keep it secret and scoped.

## 15.3 Nostr identity and messaging

```text
User signer / Nostr extension
          |
          | signs event
          v
      Nostr client
          |
          | WebSocket
          v
      Nostr relays
          |
          v
 Other Nostr clients query and verify events
```

Key rule: do not put private keys in application code or ask users to paste them into an untrusted interface.

---

# 16. Build order for a hackathon MVP

## Phase 1 — Problem and proof
- Write a one-sentence problem statement.
- Identify one primary user.
- Sketch the current workflow and the improved workflow.
- Decide what the demo must prove.
- Choose one wallet/payment/identity integration.

## Phase 2 — Technical foundation
- Create the repository and environment-variable template.
- Select Regtest, Signet, Testnet or an appropriate sandbox.
- Set up the wallet/node/provider.
- Verify that the smallest API call works before building the full UI.
- Create seed/demo data.

## Phase 3 — End-to-end workflow
- Implement the primary user flow.
- Verify the wallet or protocol response on the backend.
- Store only necessary application data.
- Add pending, failed, expired and success states.
- Add idempotency and safe retry behavior.

## Phase 4 — UX and security
- Test on a mobile-sized screen.
- Make the flow understandable without technical jargon.
- Remove unnecessary data collection.
- Protect keys, connection strings and API credentials.
- Write a short threat model.
- Label all simulated functions.

## Phase 5 — Submission readiness
- Deploy the MVP or prepare a reliable demo video.
- Publish the public GitHub repository.
- Write a README with setup and architecture.
- Record a three-minute demo.
- Prepare the requested ZIP deliverable.
- Test every public link in a logged-out browser.

---

# 17. Coding-agent instructions (for Codex or another build agent)

Use this document as a reference index, not as permission to install every tool.

When implementing a project based on this hackathon:

1. Read the project brief and identify the primary user/problem before selecting a technology.
2. Inspect the existing repository and preserve its current framework, conventions and working code.
3. Choose the minimum viable set of integrations.
4. Read the linked official documentation for each chosen integration before coding.
5. Prefer maintained official SDKs and libraries over hand-written protocol implementations.
6. Keep secrets server-side and provide `.env.example` with placeholder values only.
7. Never ask the user for a real seed phrase or private key.
8. Never put wallet secrets, NWC URIs, API keys or RPC credentials in frontend bundles, source control or logs.
9. Use a test network or provider sandbox for the demo unless real mainnet use is explicitly required and safely authorized.
10. Do not fake a successful payment. Verify the payment through the wallet/node/provider.
11. Implement loading, pending, success, failure, expired and retry states.
12. Make payment operations idempotent and avoid blind retries after ambiguous responses.
13. Keep AI separate from deterministic financial authorization and verification.
14. Add tests for the most important happy path and critical failure states.
15. Document limitations honestly, including testnet, simulated services, unsupported wallet features and provider dependencies.
16. Do not claim an integration works until it has been tested end to end.

### Required implementation notes

Before coding, produce:
- `PROJECT_BRIEF.md` — user, problem, value proposition and MVP boundary.
- `ARCHITECTURE.md` — components, data flow, trust boundaries and external services.
- `INTEGRATIONS.md` — selected tools, official docs, credentials required and test mode.
- `THREAT_MODEL.md` — assets, attackers, risks and mitigations.
- `README.md` — setup, environment variables, test commands, demo and limitations.

Only create these files if the repository does not already have equivalent documents. Do not overwrite existing project decisions without checking them.

---

# 18. Common mistakes and warnings

- **Do not run a production Bitcoin node just to show a wallet UI.** Use a suitable test setup.
- **Do not expose Bitcoin Core or CLN RPC to the public internet.**
- **Do not treat an invoice as paid because it was generated.**
- **Do not treat a Lightning payment as an on-chain transaction.**
- **Do not use mempool.space to verify an off-chain Lightning payment.**
- **Do not expose NWC connection URIs.**
- **Do not ask users for Nostr private keys if a signer can be used.**
- **Do not assume all Nostr relays support every NIP.**
- **Do not assume every Lightning wallet supports every LNURL feature.**
- **Do not claim USSD works without a provider/operator integration.**
- **Do not claim Mobile Money integration works without real provider sandbox credentials and webhook verification.**
- **Do not claim an AI assistant is a safe payment authority.**
- **Do not store more personal data than the product needs.**
- **Do not present simulated payment flows as real settlement.**

---

# 19. Primary documentation index

| Resource | Official / primary link |
|---|---|
| Dakar Bitcoin Hack resources | https://dakar-bitcoin-hack-2026.devpost.com/resources |
| Bitcoin Core | https://bitcoincore.org/ |
| Bitcoin developer guide | https://developer.bitcoin.org/devguide/ |
| Bitcoin RPC reference | https://developer.bitcoin.org/reference/ |
| Bitcoin Dev Kit | https://bitcoindevkit.org/ |
| BDK wallet docs | https://docs.rs/bdk_wallet/latest/bdk_wallet/ |
| BTCPay Server docs | https://docs.btcpayserver.org/ |
| BTCPay Greenfield API | https://docs.btcpayserver.org/Development/Greenfield/ |
| Electrum protocol | https://electrum-protocol.readthedocs.io/en/latest/ |
| Electrum wallet | https://electrum.org/ |
| Lightning Dev Kit | https://lightningdevkit.org/ |
| Core Lightning docs | https://docs.corelightning.org/docs/home |
| Core Lightning API reference | https://docs.corelightning.org/reference |
| Fulcrum | https://fulcrumserver.org/ |
| LNURL specifications | https://github.com/lnurl/luds |
| Africa's Talking developer portal (USSD example) | https://developers.africastalking.com/ |
| mempool.space REST API | https://mempool.space/docs/api/rest |
| Orange Developer | https://developer.orange.com/ |
| Wave | https://www.wave.com/ |
| Sparrow Wallet docs | https://www.sparrowwallet.com/docs/ |
| Nostr Developer Guide | https://nostrcg.github.io/devguide/ |
| Nostr NIPs | https://github.com/nostr-protocol/nips |
| Nostr tools (JavaScript) | https://github.com/nbd-wtf/nostr-tools |
| Nostr Wallet Connect docs | https://docs.nwc.dev/ |
| NIP-47 | https://github.com/nostr-protocol/nips/blob/master/47.md |
| OpenAI API docs (AI example) | https://developers.openai.com/api/docs |

---

## 20. Research notes and source quality

- The official Dakar Bitcoin Hack resources page supplies the technology list and support links. It does not provide a complete tutorial or a single mandatory stack.
- Protocol and product descriptions in this guide are based on the linked primary project documentation and repositories where available.
- Africa's Talking is listed only as an example USSD provider; the hackathon does not mandate it.
- Mobile Money APIs are provider-specific. Orange, Wave and third-party aggregators must not be treated as interchangeable or as one universal API.
- OpenAI documentation is an example of AI integration documentation; the hackathon does not require OpenAI.
- Check the current official documentation before implementation because API versions, SDKs, network support and provider access can change.
- This guide is a starting point for engineering work, not a security audit, legal opinion or guarantee that a third-party API is available to your team.

