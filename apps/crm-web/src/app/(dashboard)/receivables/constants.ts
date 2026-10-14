import { BillStatus } from "./enums";

/**
 * Bill lifecycle in order: compared by index to decide which advance buttons
 * ("Đã gửi" / "Đã thu") a row still offers.
 */
export const BILL_ORDER: BillStatus[] = Object.values(BillStatus);
