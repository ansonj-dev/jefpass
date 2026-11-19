# Dakar Bitcoin Hack 2026 — Challenge, Problem Space & Winning-Strategy Analysis

**Event:** Dakar Bitcoin Hack by BTrust  
**Organizer/host:** Dakar Bitcoin Days  
**Official page:** https://dakar-bitcoin-hack-2026.devpost.com/  
**Research date:** 19 November 2026  
**Submission deadline:** 20 November 2026, 20:00 UTC  
**Format:** Online, public, non-profit, open-source-oriented hackathon

---

## 1. Executive summary

Dakar Bitcoin Hack 2026 is asking participants to create **useful, working, Bitcoin/Nostr/AI-centered tools that improve everyday life for people in Africa**.

It is not a narrowly defined challenge with one prescribed problem to solve. The organizers provide a broad mission, examples of acceptable product categories, a suggested technology ecosystem, and judging criteria. Participants are expected to identify a meaningful local or regional problem, explain why it matters, and demonstrate a working solution.

The central challenge can be summarized as:

> Find a real problem affecting people in an African community or market, then use Bitcoin, Lightning, Nostr and/or AI to make the relevant activity more accessible, affordable, reliable, secure or efficient.

The strongest interpretation of the brief is **problem-first, technology-enabled, locally grounded product building**. Merely adding a Bitcoin payment button, a chatbot, a token or a blockchain ledger to an otherwise ordinary app is unlikely to be enough. The Bitcoin-related component should be integral to the value the user receives.

### The five things the judges explicitly evaluate

1. **Usefulness & Local Impact** — a real, well-scoped local problem, a clearly identified primary user, a changed daily workflow and a credible estimate of reach.
2. **Security by Design** — minimal attack surface, threat model, least privilege, safe secrets, input validation, no personal data in logs, and proven Bitcoin/Lightning libraries.
3. **UX/UI Quality** — fast, low-friction use on low-bandwidth connections and mid-range phones; clear language and helpful errors.
4. **Working MVP** — an end-to-end working demo, one-command setup, seed data and a testable happy path. Avoid mockups if a minimal integration is possible.
5. **Clear Pitch & Docs** — a three-minute demo covering problem, solution, impact and next steps, plus a useful README and architecture diagram.

**Strategic conclusion:** A small product that solves one painful workflow and proves it end to end is a better fit than a broad platform with many incomplete features.

---

## 2. What the organizers officially want participants to build

The official challenge statement is:

> “Create tools that will enhance the life of African people, around or on top of the Bitcoin protocol, the lightning network, nostr and AI.”

The official “What to Build” section says the organizers expect **Bitcoin, Nostr and AI-centered solutions** whose main aim is to answer **local and regional population needs**.

They list these examples:

- Wallets
- Learning tools
- Exchanges
- Contributions to Bitcoin Core or Lightning
- Messaging applications built on Nostr
- Authentication methods using Nostr Wallet Connect (NWC)
- Bitcoin and AI applications

These are examples, not a closed list of tracks. There are no separate judging tracks listed in the judging-criteria response.

### What this means in practice

A submission should satisfy three connected tests:

**A. A real user problem exists.**  
The project should identify a specific user group and a recurring activity that is currently expensive, slow, difficult, risky, inaccessible or poorly served.

**B. The Bitcoin/Nostr/AI technology is relevant.**  
The project should explain why the selected protocol or tool is useful to the problem. For example, Lightning may enable fast small-value settlement; Nostr may provide interoperable identity or messaging; AI may simplify a complex task or interpret information; Bitcoin may provide a payment or settlement rail.

**C. The prototype proves the important claim.**  
The judges should be able to use or observe the core workflow, not just see a design mockup or a slide describing a future product.

---

## 3. What problem are they actually asking you to solve?

### 3.1 There is no single official problem statement

The official page says the hackathon aims to tackle issues people face in their day-to-day lives that the organizers believe Bitcoin can help solve. It does **not** provide a fixed catalogue of numbered problem statements, a required sector, or one mandatory use case.

Therefore, the following are **problem areas inferred from the mission and examples**, not official organizer-issued problem statements.

### 3.2 Problem areas that fit the brief

| Problem area | Example user pain | Potential Bitcoin / Nostr / AI role |
|---|---|---|
| Small merchant payments | Cash handling, delayed settlement, costly payment acceptance, difficult reconciliation | Lightning POS, QR invoices, payment confirmation, simple sales records |
| Cross-border transfers | Cost, delay, opaque fees, poor access to financial services | Lightning settlement, transparent quote/fee display, payment status |
| Informal savings groups | Manual contribution tracking, disputes, trust in the organizer, missed payments | Lightning contributions, conditional payments, auditable receipts, Nostr coordination |
| Financial access and self-custody | Users struggle to understand wallets, keys, backups and transaction risks | Simple wallet UX, guided self-custody, recovery education, AI explanations |
| Financial and Bitcoin education | Technical concepts are difficult to understand; users lack practical learning | Interactive learning, simulations, wallet practice, AI tutor |
| Small business operations | Poor records, inventory uncertainty, limited digital tools | Merchant tools with Lightning payments, Nostr identity/receipts, AI assistance |
| Remittances and conditional payments | Sender cannot easily verify that money was used for the intended purpose | Conditional payment workflows, milestone releases, verifiable receipts |
| Digital identity and authentication | Fragmented accounts, password friction, dependence on centralized identity | Nostr keys, NWC-based authorization, permissioned signing flows |
| Community communication | Centralized platforms, lack of user control or portability | Nostr messaging, community channels, encrypted communication |
| Developer infrastructure | Difficulties integrating Bitcoin/Lightning safely | Open-source libraries, testing tools, developer contributions, better documentation |
| AI-assisted financial workflows | Users cannot easily interpret fees, payment states or wallet actions | AI explanations and assistance with deterministic transaction validation |

### 3.3 The strongest problem framing

Avoid framing a project as:

- “We are building a blockchain platform.”
- “We are bringing Web3 to Africa.”
- “We are using AI to revolutionize finance.”
- “We are building a super app for everyone.”

Those statements do not identify a user or a problem.

Prefer a framing like:

> “Independent market vendors need a reliable way to accept digital payments and reconcile daily sales. Existing workflows are fragmented or difficult to use. Our product provides a simple merchant checkout and verifiable payment confirmation using Lightning, designed for low-cost phones and unreliable connectivity.”

That framing identifies:
- A primary user.
- A daily workflow.
- A practical pain point.
- A technology that serves a purpose.
- A measurable outcome.

---

## 4. What the organizers expect at submission

The official “What to Submit” section lists three items:

1. A brief presentation of the proposed solution — text or video.
2. A prototype, Minimum Viable Product (MVP) or Proof of Concept (PoC).
3. At least a Bitcoin/Lightning wallet implementation.

The official rules add that a project should have:

- A presentation (text or video).
- A **public GitHub repository**.
- An MVP accessible through the internet, **or a demo video**.

### Important interpretation: the wallet requirement

The phrase “at least, a bitcoin/lightning wallet implementation” is an explicit requirement in the official submission description. Do not assume that simply mentioning Bitcoin or linking to a wallet is enough.

A safe implementation should demonstrate a real wallet-related interaction, such as:

- Creating or connecting a wallet.
- Displaying a wallet balance from the selected network.
- Generating a Bitcoin address or Lightning invoice.
- Receiving or paying a test payment.
- Showing transaction status or history.
- Demonstrating safe wallet connection and authorization.

The exact depth depends on the product, but the wallet should be part of the working product experience.

**Do not fake real payment settlement.** If the demo uses Regtest, Signet, Mutinynet or another test environment, label it clearly. Explain what is simulated and what is genuinely connected.

### Important inconsistency in the Devpost fields

The structured Devpost submission-requirements response currently marks:
- `video_required: true`
- `zip_file_required: true`
- `website_required: false`

The prose “What to Submit” and rules sections describe a presentation, a prototype/MVP/PoC, a public GitHub repository and an accessible MVP or demo video. They do not explicitly explain the ZIP requirement in the retrieved prose.

**Practical recommendation:** prepare a public demo video and a clean ZIP of the project/source or required deliverable, in addition to the public GitHub repository and live MVP. Check the actual Devpost submission form before final submission in case the upload field clarifies the ZIP contents or accepted format.

---

## 5. Technology ecosystem: what tools are encouraged and why

The hackathon resources list the following tools and technologies. This is an ecosystem reference, not a requirement to use every item.

| Technology | What it is useful for | Example use in a project |
|---|---|---|
| Bitcoin Core | Bitcoin node and chain interaction | Regtest environment, transaction validation, wallet/node integration |
| Bitcoin Dev Kit (BDK) | Bitcoin wallet development toolkit | Building wallet functionality into an application |
| BTCPay Server | Self-hosted Bitcoin payment processing | Merchant checkout and invoice/payment acceptance |
| Electrum server | Wallet backend/indexing interface | Wallet history and blockchain data access |
| Lightning Dev Kit (LDK) | Lightning Network development library | Integrating Lightning functionality into an application |
| Lightning Core / Core Lightning | Lightning node implementation | Lightning invoices, payments and routing |
| C-Lightning | Earlier name used for Core Lightning | Lightning node development and integration |
| Fulcrum server | Electrum-compatible server | Efficient wallet queries |
| USSD | Mobile network menu-based interface | Feature-phone access and low-data workflows |
| LNURLPoS | Lightning point-of-sale pattern | Merchant payment acceptance |
| mempool.space | Bitcoin mempool/block explorer data | Transaction status and network visibility |
| Mobile Money APIs | Local/mobile payment rails | Fiat on/off-ramp or complementary payment workflows |
| Sparrow Wallet | Desktop Bitcoin wallet | Testing, wallet operations and transaction inspection |
| Nostr | Open protocol for decentralized social/messaging data | Identity, messaging, event publication and portable interactions |
| Nostr Wallet Connect (NWC) | Standard for connecting applications to Lightning wallets | Wallet connection, invoice and payment requests with user authorization |
| AI | Language, reasoning, classification and assistance | Education, translation, support, workflow assistance and data interpretation |

### Technology selection advice

Do not add technology merely to match the list. Choose the smallest reliable set that proves the core workflow.

- **Payments/merchant product:** Lightning wallet or node, BTCPay/LDK/Core Lightning, QR invoices and a clear payment state.
- **Wallet/education product:** BDK or an established wallet integration, a test network, guided flows and clear safety instructions.
- **Messaging/identity product:** Nostr events, keys, signing and a clear permission model.
- **AI product:** AI should solve a specific user task. Keep payment authorization and transaction validation deterministic; an AI model should not be trusted to decide whether a payment is settled.
- **Feature-phone product:** USSD can be a strong differentiator if a working operator/API integration is feasible. Do not claim USSD support if the demo only imitates it.

---

## 6. Judging criteria — detailed interpretation

The official judging criteria have five categories. The Devpost tool reports a judging scale of 5, but does not expose individual category weights. Do not assume all categories have different weights or that any unpublished score formula exists.

### 6.1 Usefulness & Local Impact

**Official criterion:** Solve a real, well-scoped local problem. Identify the primary user, show how the product changes their daily workflow, and estimate reach (for example, merchants served per week).

What a strong submission demonstrates:
- One clearly named primary user.
- A real task that user performs repeatedly.
- The current friction or cost.
- A short before-and-after workflow.
- Evidence of user discovery, even if small.
- A credible metric.

Useful metrics could include:
- Time to complete a payment.
- Cost per transaction.
- Number of successful payments.
- Failed-payment rate.
- Number of merchants onboarded.
- Time spent reconciling daily sales.
- Contribution completion rate in a savings group.
- Lesson completion and wallet-safety task success.
- Number of active users in a pilot.

**Weak approach:** “Our app can help millions of Africans.”

**Strong approach:** “In a test with 5 shop owners, the checkout flow reduced the steps required to confirm a Lightning payment from X to Y. The prototype processed N test payments.”

Only report numbers actually measured. If a number is a target or projection, label it as such.

### 6.2 Security by Design

**Official criterion:** Minimal attack surface, threat model, least-privilege access, safe secret handling, validated inputs, no PII in logs, proven Bitcoin/Lightning libraries and secure defaults.

What judges may look for:
- No private keys committed to GitHub.
- No wallet seed phrases stored in plaintext.
- No API secrets embedded in frontend code.
- Clear distinction between client and server responsibilities.
- Input validation for addresses, invoices and payment amounts.
- Payment authorization by the wallet/user, not by an AI model.
- Correct handling of pending, failed, expired and successful payments.
- Idempotency to prevent duplicate payment actions.
- Safe error handling and privacy-conscious logs.
- A short threat model explaining what can go wrong.

For an NWC application:
- Request only the permissions needed.
- Make wallet connection and permission scope visible.
- Avoid exposing connection secrets.
- Provide a disconnect/revoke path.
- Do not silently initiate payments.

For a custodial or server-managed wallet:
- Explain who controls the keys.
- State the custody model honestly.
- Protect signing credentials.
- Define withdrawal and recovery controls.

A small, honest security model is better than claiming that a prototype is “fully secure.”

### 6.3 UX/UI Quality

**Official criterion:** Fast, frictionless flows on low-bandwidth connections and mid-range phones; clear labels, helpful errors, accessible contrast/size and simple copy without jargon.

What that implies:
- Mobile-first layout.
- Small payloads and compressed images.
- No unnecessary animation or heavy dashboards.
- Clear language, including French or relevant local languages when appropriate.
- Large touch targets.
- Clear payment amount and currency/unit.
- Distinct states: waiting, paid, failed, expired and cancelled.
- Recovery instructions when connectivity drops.
- Avoid forcing users to understand technical Bitcoin terms.

A polished desktop dashboard alone is not sufficient evidence of good UX for the stated audience.

### 6.4 Working MVP

**Official criterion:** An end-to-end demo that actually runs, one-command setup (Docker or script), seed data and a testable happy path. Avoid mockups when a minimal integration is possible.

A strong MVP has:
- A publicly accessible deployment or a reliable demo video.
- A working happy path from start to finish.
- A real Bitcoin/Lightning wallet interaction.
- A reproducible local setup.
- Seed data or a resettable test environment.
- Clear test instructions.
- A visible distinction between testnet/regtest and mainnet.
- No dead buttons or screens that only look functional.

Suggested demo test:
1. Open the app.
2. Create or connect a test wallet.
3. Perform the key user task.
4. Complete or simulate a clearly labelled test transaction.
5. Show the resulting status and record.
6. Explain what is real, what is mocked and what remains future work.

### 6.5 Clear Pitch & Documentation

**Official criterion:** A three-minute demo covering problem → solution → impact → next steps. README should include setup, architecture diagram, constraints, metrics to track and the next iteration.

A strong README should contain:
- One-sentence value proposition.
- User and problem.
- Screenshots or short GIF.
- Architecture diagram.
- Technology choices and why they matter.
- Local setup commands.
- Environment-variable example file without real secrets.
- Demo credentials/test instructions if needed.
- Wallet/network details.
- Known limitations and threat model.
- Tests and measured results.
- Roadmap.

A strong three-minute presentation structure:

| Time | Content |
|---|---|
| 0:00–0:25 | The user and the problem |
| 0:25–0:50 | Why the existing workflow is painful |
| 0:50–1:10 | Product and key differentiator |
| 1:10–2:20 | Live end-to-end demonstration |
| 2:20–2:45 | Impact, metrics and security |
| 2:45–3:00 | Next steps and open-source contribution |

---

## 7. What could make a project stand out

The criteria do not publish a separate “bonus points” list. The following are strategic recommendations derived from the official criteria.

### 7.1 Solve a narrow problem unusually well

A focused product is easier to test and easier for judges to remember. One complete payment or savings workflow is stronger than ten disconnected modules.

### 7.2 Make the local context visible

Show why the user and workflow matter in the target community. Relevant details may include:
- Local merchant habits.
- Mobile-first usage.
- Low or inconsistent connectivity.
- Language and literacy needs.
- Small transaction sizes.
- Existing mobile-money workflows.
- Trust and dispute-resolution challenges.

Do not assume every African country or user has the same needs. Senegal-specific claims should be grounded in research or user feedback.

### 7.3 Make Bitcoin essential to the product

Ask: if Bitcoin/Lightning/Nostr were removed, would the product lose its core value?

If the answer is no, the protocol integration may be decorative. Rework the product so the chosen technology solves a real constraint.

### 7.4 Prove the integration, not just the interface

A screenshot of a Lightning invoice is not proof that a payment works. Show the invoice being generated, paid in the chosen test environment, and verified by the application.

### 7.5 Be honest about limitations

Judges are likely to value a prototype that clearly explains its boundaries over one that overclaims. Label:
- Testnet versus mainnet.
- Simulated versus real payment.
- Demo data versus real user data.
- Planned integrations versus connected integrations.
- Prototype security versus audited production security.

### 7.6 Build in public

The organizers explicitly say participants should participate, build in public and communicate about their journey. Share meaningful progress:
- Problem discovery.
- Architecture decisions.
- A working feature.
- A test/demo.
- What failed and how it was fixed.

This is part of the event's stated culture, not a substitute for the working submission.

---

## 8. Project directions that fit the challenge

These are **independent concept directions**, not official tracks or organizer-endorsed projects. Each is assessed against the published mission and criteria.

| Concept direction | User/problem | Core protocol role | MVP proof | Main risk |
|---|---|---|---|---|
| Lightning merchant POS | Small merchants need a simple way to accept and reconcile payments | Lightning invoice/payment; optional NWC | Create invoice → pay → verify → daily sales record | Payment state handling and real merchant adoption |
| Tontine/savings-circle tool | Groups need transparent contributions and predictable payouts | Lightning conditional payments/receipts; Nostr coordination | Create group → members contribute → payout/refund path | Complex custody, hold-invoice and refund assumptions |
| Cross-border payment assistant | Users need transparent, understandable transfer workflows | Lightning settlement; AI for explanation, not signing | Quote → invoice → payment → status | Liquidity, fiat conversion and regulatory complexity |
| Bitcoin learning companion | Beginners need practical wallet and payment education | Test wallet, Lightning, optional Nostr identity | Lesson → wallet task → test payment → learning record | Must teach safe behavior, not just quiz facts |
| Merchant cashbook | Small businesses need simple sales, stock and payment records | Lightning payment proof; optional Nostr identity | Record sale → accept payment → show daily summary | Avoid becoming a generic accounting app |
| Nostr-based community service | Communities need portable, user-controlled communication | Nostr identity/events and encrypted messaging | Create identity → publish/send → verify permissions | UX complexity and key recovery |
| AI wallet copilot | Users struggle with wallet states, fees and safe transaction steps | Wallet integration; AI explains validated state | Connect wallet → inspect invoice → explain state | AI hallucinations and unsafe autonomous payments |
| Bitcoin developer tool | Developers need easier local integration and testing | Bitcoin Core/LDK/BDK/Lightning | One-command local test stack and reproducible test | Must show value beyond another wrapper |

### Relative fit (qualitative)

- **Strong direct fit:** merchant payments, savings circles, wallet education, Lightning wallet tools, Nostr messaging/identity.
- **Strong if tightly scoped:** cross-border payments, AI wallet copilot, merchant operations.
- **More technically demanding:** routing/liquidity systems, USSD integrations, protocol-level Bitcoin Core/Lightning contributions.
- **Potentially weak if superficial:** generic AI chatbot, generic blockchain dashboard, token/NFT project with no daily user problem, ordinary marketplace with a Bitcoin logo.

This is a strategic fit assessment, not a prediction of judging outcomes.

---

## 9. What not to build (or what to avoid)

These approaches are poorly aligned if they are not tied to a real user problem and a working protocol interaction:

1. **A generic token launch.** The event asks for practical tools around Bitcoin, Lightning, Nostr and AI, not token issuance for its own sake.
2. **A blockchain-only certificate or NFT platform.** It needs a concrete user need and an actual Bitcoin/Lightning wallet implementation.
3. **An AI chatbot with no Bitcoin/Nostr workflow.** AI is one of the technologies, but the challenge is Bitcoin/Nostr/AI-centered.
4. **A UI-only prototype.** The MVP criterion explicitly asks for a working end-to-end demo.
5. **A feature-heavy super app.** Too many incomplete features make it difficult to prove usefulness and reliability.
6. **A custodial wallet without explaining custody.** This creates major security and trust questions.
7. **A demo that silently simulates payments.** Clearly identify simulated actions and demonstrate a real test-environment interaction where possible.
8. **A project that ignores local context.** “For Africa” is not a substitute for identifying a particular user and problem.
9. **An AI agent that can spend funds without user authorization.** Payment authority should remain within explicit wallet permissions and deterministic controls.
10. **A README that only lists technologies.** The README should enable judges to run, understand and test the product.

---

## 10. A practical project-selection framework

Before committing to an idea, score it against these questions. This is a suggested decision tool, not the official judging rubric.

| Question | Strong answer |
|---|---|
| Who is the primary user? | One specific, reachable user group |
| What exact task is painful? | A frequent, concrete workflow |
| Why does it matter? | Time, cost, access, trust or reliability impact |
| Why Bitcoin/Lightning/Nostr? | A clear technical reason, not branding |
| What is the wallet implementation? | A working wallet or wallet connection interaction |
| What can be completed in the available time? | One end-to-end happy path |
| How can it be tested? | Public deployment, test environment or reproducible demo |
| What is the security model? | Clear keys, permissions, validation and threat boundaries |
| What will be measured? | A few meaningful product metrics |
| Can it be explained in three minutes? | Problem, product, proof and impact are immediately clear |

### Suggested weighting for your own idea selection

This is an internal planning heuristic only; it is **not** an official Devpost scoring formula.

- Local problem importance and clarity: 25%
- Working Bitcoin/Lightning/Nostr integration: 25%
- MVP feasibility and demo reliability: 20%
- Security and trust: 15%
- UX and local accessibility: 10%
- Originality and future potential: 5%

A concept with high novelty but no working wallet/payment workflow should not outrank a less novel concept with a compelling, testable solution.

---

## 11. Submission checklist

### Product and functionality
- [ ] Primary user and problem are explicit.
- [ ] Product's main workflow works from beginning to end.
- [ ] Bitcoin/Lightning wallet implementation is present.
- [ ] Test environment and real-money status are clearly labelled.
- [ ] Error, pending, expired and failure states are handled.
- [ ] No major dead ends or placeholder-only screens.

### Security
- [ ] No private keys, seed phrases or production secrets in the repository.
- [ ] Environment variables are documented safely.
- [ ] Wallet permissions are minimal and visible.
- [ ] Inputs are validated.
- [ ] Payment state is verified through the wallet/node/provider.
- [ ] Duplicate requests and uncertain states are handled.
- [ ] Logs avoid personal or secret information.
- [ ] Known security limitations are documented.

### User experience
- [ ] Mobile layout works.
- [ ] Core workflow is understandable without Bitcoin jargon.
- [ ] Low-bandwidth use is considered.
- [ ] Buttons and status messages are clear.
- [ ] Language and accessibility needs are considered.

### Public project materials
- [ ] Public GitHub repository.
- [ ] Accessible deployed MVP or demo video.
- [ ] Brief presentation.
- [ ] Three-minute demo video prepared.
- [ ] README includes setup, architecture, constraints and metrics.
- [ ] Architecture diagram included.
- [ ] ZIP deliverable prepared, pending confirmation of the Devpost upload field.
- [ ] All links tested in a logged-out/private browser window.
- [ ] No credentials or sensitive data in screenshots or video.

---

## 12. Deadline, eligibility and event details

### Dates

| Milestone | Official time (UTC) |
|---|---|
| Submissions open | 26 October 2026, 08:00 |
| Submission deadline | **20 November 2026, 20:00** |
| Public voting | 9 November 2026, 09:00 – 24 November 2026, 17:00 |
| Judging | 21 November 2026, 09:00 – 26 November 2026, 17:00 |
| Winners announced | 28 November 2026, 17:00 |

At the time of this report (19 November 2026), the deadline is the following day. The submission window is still open according to the official Devpost status.

### Eligibility discrepancy — verify with the organizer

The official rules prose says participants should reside in Africa. However, the structured eligibility summary on the same Devpost record says all countries/territories except standard excluded locations, while also saying students only, above the legal age of majority, and companies/professional organizations excluded.

These two geography descriptions do not fully agree. **Do not rely on the broad “all countries” summary without clarification if your residence is outside Africa.** Ask the hackathon manager through the official Devpost page or organizer support channels before relying on eligibility.

The official overview also describes the event as student-focused and excludes companies/professional organizations.

### Prizes

The official rules list:
- 1st: 500,000 sats
- 2nd: 250,000 sats
- 3rd: 100,000 sats

The overview lists a total prize value of $900 in cryptocurrency. BTC value in fiat terms can change.

### Event format and goals

- 100% online.
- Public, non-profit event.
- Organizers say results are open-source.
- The organizers aim to contribute to the FOSS Bitcoin ecosystem, solve practical problems using Bitcoin/Nostr/AI, increase visibility, identify potential incubation opportunities and create startups.
- Attendee goals include collaboration, learning, building real products and starting innovative projects.

---

## 13. Final strategic recommendation

If the goal is to maximize alignment with this challenge, do not start by asking “What blockchain feature can we build?”

Start with:

1. **Choose one user:** for example, a market vendor, savings-group member, student learning Bitcoin, or small business owner.
2. **Choose one repeated pain point:** payment acceptance, contribution tracking, wallet onboarding, payment verification or a difficult financial workflow.
3. **Choose the protocol that solves it:** Lightning for payments, Nostr for identity/messaging/coordination, AI for explanation or assistance.
4. **Make the wallet interaction real:** use an established wallet/library or a clearly documented NWC integration.
5. **Build one complete workflow:** a user should be able to perform the task without the team manually intervening.
6. **Test with real people if possible:** even a small number of target users can help reveal confusing steps.
7. **Measure one outcome:** time saved, payment success, fewer errors, contribution completion or learning task completion.
8. **Document security and limitations:** especially custody, key handling, permissions, testnet use and simulated functions.
9. **Show the product in three minutes:** demonstrate the actual workflow rather than spending the whole video on slides.
10. **Publish cleanly:** public repo, accessible MVP/demo, concise README, presentation and the required Devpost attachments.

### The one-sentence interpretation

**Build an open-source, secure and easy-to-use Bitcoin/Lightning/Nostr/AI product that solves one demonstrable everyday problem for a clearly identified African user — and prove that it works.**

That is the most faithful reading of the official brief and judging criteria.

---

## 14. Sources

Primary sources:

1. **Official hackathon overview and challenge brief**  
   https://dakar-bitcoin-hack-2026.devpost.com/

2. **Official “What to Build” and “What to Submit” requirements**  
   https://dakar-bitcoin-hack-2026.devpost.com/

3. **Official rules, eligibility, public repository/MVP requirements and prizes**  
   https://dakar-bitcoin-hack-2026.devpost.com/rules

4. **Official schedule and dates**  
   https://dakar-bitcoin-hack-2026.devpost.com/details/dates

5. **Official resources and technology list**  
   https://dakar-bitcoin-hack-2026.devpost.com/resources

6. **Official project gallery**  
   https://dakar-bitcoin-hack-2026.devpost.com/project-gallery

### Research notes

- The event overview, resources, rules, dates, submission requirements and judging criteria were checked against the official Devpost event record on 19 November 2026.
- Problem areas and project concepts in this report are analytical interpretations of the official mission; they are not represented as additional official tracks.
- The suggested idea-selection weights, metrics, demo outline and implementation checklist are recommendations, not official scoring weights or additional rules.
- Where the official page's prose and structured eligibility/submission fields differ, the discrepancy is explicitly flagged rather than silently resolved.
