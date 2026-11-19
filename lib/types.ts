export const CUSTOMER_PROOF_KIND = 27236;

export type PaymentState = "NOT_REQUESTED" | "INVOICE_CREATED" | "PENDING" | "UNKNOWN" | "SETTLED" | "EXPIRED" | "FAILED" | "CANCELLED" | "UNDERPAID" | "OVERPAID";
export type ServiceState = "QUOTED" | "ACCEPTED" | "COMPLETED" | "ACKNOWLEDGED" | "DISPUTED";
export interface Worker { id: string; name: string; occupation: string; bio: string; pubkey?: string; }
export interface Payment {
  state: PaymentState; operationId: string; source: string; network: string;
  walletFingerprint: string; expectedMsat: number; invoice?: string;
  paymentHash?: string; preimage?: string; expiresAt?: number; settledAt?: number;
  verifiedAt?: string; error?: string;
}
export interface Job {
  id: string; workerId: string; title: string; description: string; category: string;
  amountSats: number; currency: "SAT"; displayAmount?: string; dueDate?: string;
  state: ServiceState; createdAt: string; acceptedAt?: string; completedAt?: string;
  acknowledgedAt?: string; tokenHash: string; tokenExpiresAt: number;
  customerPubkey?: string; acknowledgements: unknown[]; payment?: Payment;
  evidence?: { hash: string; name: string; type: string; size: number }[];
  receiptId?: string; shared: boolean;
}
export const isPaymentVerified = (payment?: Payment) => payment?.state === "SETTLED" && !!payment.verifiedAt;
export const isWorkCompleted = (job: Pick<Job, "completedAt">) => !!job.completedAt;