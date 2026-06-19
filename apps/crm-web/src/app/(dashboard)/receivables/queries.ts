import { paymentMilestones } from "@/data/mock/payment-milestones";
import { API_URL, apiFetchSafe } from "@/lib/http";

import type { PaymentMilestone } from "./types";

export async function listPaymentMilestones(): Promise<PaymentMilestone[]> {
  return API_URL
    ? apiFetchSafe<PaymentMilestone[]>("/payment-milestones", [])
    : paymentMilestones;
}
