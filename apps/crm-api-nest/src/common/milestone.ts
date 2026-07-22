// Business rule (crm-api teaching capstone, task 11): a milestone flagged
// `gated_by_acceptance` may only be collected once the công trình has an
// approved nghiệm thu (an Acceptance row with status "da_nghiem_thu"). Pure so
// it can be unit-tested without a database.
export function canCollect(
  gatedByAcceptance: boolean,
  hasApprovedAcceptance: boolean
): boolean {
  return !gatedByAcceptance || hasApprovedAcceptance;
}
