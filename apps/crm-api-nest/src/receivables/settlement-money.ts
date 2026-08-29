// Quyết toán money math — pure, so the sign path, the seed's invariant test and
// the unit tests all read the same rules without pulling in the Nest controller
// graph. Mirrored display-side by crm-web utils/quote-totals.ts.
import { BadRequestException, ConflictException } from "@nestjs/common";

import { toBig } from "../common/coerce";

/** A line as the client sends it — the only fields the money math needs. */
export type SettlementItemAmounts = {
  quantity: number;
  unit_price: number;
};

/** amount = round(quantity × unit_price) per item; total = Σ amounts. */
export const computeItemAmounts = <T extends SettlementItemAmounts>(
  items: T[]
): { amounts: bigint[]; total: bigint } => {
  const amounts = items.map(
    (it) => toBig(Math.round(it.quantity * it.unit_price))!
  );
  return { amounts, total: amounts.reduce((sum, a) => sum + a, 0n) };
};

/**
 * Giảm giá can never exceed what there is to discount. Checked at WRITE time
 * (create/update) so an unsignable row is never stored, and again in
 * {@link payableTotal} for the sign path, which reads the row back from the DB.
 */
export const assertDiscountWithin = (total: bigint, discount: bigint): void => {
  if (discount > total)
    throw new BadRequestException(
      `giảm giá (${discount}) exceeds the quyết toán subtotal (${total})`
    );
};

/**
 * What the client actually owes on a quyết toán: (Σ items − giảm giá) + VAT.
 *
 * `total_amount` stays the pre-tax Σ (the quyết toán sheet prints it as "Cộng"),
 * so this is the ONLY figure that may reach a bill or an đợt thanh toán —
 * billing the subtotal under-asks by the tax the hợp đồng charged.
 *
 * VAT rounds through Number, exactly as the web app's quoteTotals does, so the
 * printed sheet and the billed figure cannot disagree by a đồng. Safe for VND:
 * a settlement would have to exceed 9×10^15 to lose precision.
 */
export const payableTotal = (s: {
  total_amount: bigint;
  discount_amount: bigint;
  vat_rate: number;
}): bigint => {
  assertDiscountWithin(s.total_amount, s.discount_amount);
  const net = s.total_amount - s.discount_amount;
  return net + BigInt(Math.round(Number(net) * s.vat_rate));
};

/**
 * Balance đợt on sign = settlement payable − EVERY unallocated cọc.
 * Deliberately status-blind: đợt thanh toán are a payment SCHEDULE, so
 * sum(bill's đợt) must equal bill.total_amount. An unpaid `not_due` cọc is
 * still a scheduled obligation — subtracting only the paid ones would bill the
 * full balance next to it and double-bill the client. Do not "fix" this by
 * filtering `status: "paid"`.
 */
export const settlementRemainder = (
  total: bigint,
  deposits: { amount: bigint }[]
): bigint => {
  const allocated = deposits.reduce((sum, d) => sum + d.amount, 0n);
  const remainder = total - allocated;
  if (remainder < 0n)
    throw new ConflictException(
      `cọc already scheduled (${allocated}) exceeds the quyết toán payable (${total}) — correct the đợt thanh toán before signing`
    );
  return remainder;
};
