# JëfPass Demo Guide

A good JëfPass demo is a short, honest end-to-end story. Do not fabricate payments, wallets, users or settlement evidence.

## 1. Environment

- Use Node.js 24.x and install with npm ci.
- Start the application using npm run dev -- --port 3100.
- Default network is REGTEST / NO REAL MONEY.
- Keep AI disabled; the demo does not need paid model calls.
- Use a dedicated demo account and synthetic job descriptions.
- Do not include real customer information or private wallet data in screenshots or video.

## 2. Browser workflow demonstration

1. Open the public landing page.
2. Select English or French.
3. Open the worker workspace and register a demo technician.
4. Create a laptop repair quote with a clear scope and satoshi amount.
5. Generate the expiring customer link and display its QR code.
6. Open the customer URL in a separate browser profile or private window.
7. Confirm that the customer can review the quote without an account.
8. Accept the quoted work in the customer browser.
9. Return to the worker and mark the job completed.
10. Return to the same customer browser session and acknowledge completion.
11. Show that service and payment states remain separate.
12. Issue an unpaid receipt snapshot.
13. Open the public receipt verifier and show the canonical commitment and issuer signature checks.
14. Export the private proof bundle and run the offline verifier. Explain why an independent issuer-key pin is necessary.

This is an unpaid workflow demonstration. It does not satisfy the genuine wallet settlement demonstration by itself.

## 3. Genuine test-network payment demonstration

Only attempt this after obtaining a compatible wallet and a separately controlled payer wallet.

1. Configure the operator WSS relay allowlist and a supported test network.
2. Create a dedicated NWC connection in the receiving wallet with only get_info, make_invoice and lookup_invoice permissions.
3. Connect it in the JëfPass workspace.
4. Complete and acknowledge a job.
5. Request the invoice.
6. Pay it from the separate customer wallet on the same network.
7. Reconcile the original invoice.
8. Show the wallet lookup result, amount, payment hash and preimage verification in a safe redacted view.
9. Issue a new receipt snapshot and export its private proof bundle.
10. Verify the bundle using an issuer key obtained independently.

Never expose the raw NWC URI, secret, preimage, private invoice export or customer capability link in the recording.

If no external wallet payment has been performed, say that honestly. Do not substitute a fixture or fake settlement screen.

## 4. Offline draft demonstration

1. Open the worker workspace while connected.
2. Open a new job draft and enter non-sensitive sample text.
3. Disable network connectivity.
4. Save the draft or queue a new job.
5. Restore connectivity.
6. Show synchronization and the stable job record.
7. State that this is non-financial offline support. It does not make Lightning payments or customer signatures work offline.

## 5. Three-minute pitch structure

| Time | Content |
|---|---|
| 0:00–0:25 | Independent technician and fragmented job records |
| 0:25–0:50 | Agreeing scope and customer acknowledgement |
| 0:50–1:35 | Live customer QR flow and completion |
| 1:35–2:15 | Lightning architecture and genuine payment evidence, if actually available |
| 2:15–2:40 | Receipt verification and trust limitations |
| 2:40–3:00 | User validation still needed and next iteration |

## 6. Demo reset

Use a dedicated demo account, labelled seed records and the documented reset procedure. Do not delete a production database or reset a wallet with an unresolved invoice. Preserve the original invoice identity for any UNKNOWN outcome.
