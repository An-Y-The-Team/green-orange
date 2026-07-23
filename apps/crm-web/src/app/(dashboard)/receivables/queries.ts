import { bills } from "@/data/mock/bills";
import { paymentMilestones } from "@/data/mock/payment-milestones";
import { settlements } from "@/data/mock/settlements";
import { API_URL, apiFetchSafe } from "@/lib/http";

import type { Bill, PaymentMilestone, Settlement } from "./types";

export async function listPaymentMilestones(): Promise<PaymentMilestone[]> {
  return API_URL
    ? apiFetchSafe<PaymentMilestone[]>("/payment-milestones", [])
    : paymentMilestones;
}

export async function listBills(): Promise<Bill[]> {
  return API_URL ? apiFetchSafe<Bill[]>("/bills", []) : bills;
}

export async function listSettlements(): Promise<Settlement[]> {
  return API_URL ? apiFetchSafe<Settlement[]>("/settlements", []) : settlements;
}
