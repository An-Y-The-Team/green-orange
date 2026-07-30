/**
 * Đọc số tiền thành chữ — render a VND amount as Vietnamese words, e.g.
 * 81_307_800 → "Tám mươi mốt triệu ba trăm lẻ bảy nghìn tám trăm đồng".
 *
 * Used by the contract merge context for the `value_in_words` token (legal
 * documents must spell the contract value). Pure, no deps. Handles 0..10^12-1
 * (up to hundreds of billions), which covers any realistic contract value.
 */
const ONES = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];

// Scale word per 3-digit group, least-significant first.
const SCALES = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

/** Read a 0..999 group. `leadingZeros` forces hundreds to be spoken even when
 * the hundreds digit is 0 (needed for non-leading groups, e.g. the "lẻ" cases). */
function readGroup(num: number, leadingZeros: boolean): string {
  const hundreds = Math.floor(num / 100);
  const tens = Math.floor((num % 100) / 10);
  const ones = num % 10;
  const parts: string[] = [];

  if (hundreds > 0 || leadingZeros) {
    parts.push(`${ONES[hundreds]} trăm`);
  }

  if (tens === 0) {
    if (ones > 0 && (hundreds > 0 || leadingZeros)) {
      parts.push(`lẻ ${ONES[ones]}`);
    } else if (ones > 0) {
      parts.push(ONES[ones]);
    }
  } else if (tens === 1) {
    parts.push("mười");
    if (ones === 5) parts.push("lăm");
    else if (ones > 0) parts.push(ONES[ones]);
  } else {
    parts.push(`${ONES[tens]} mươi`);
    if (ones === 1) parts.push("mốt");
    else if (ones === 5) parts.push("lăm");
    else if (ones > 0) parts.push(ONES[ones]);
  }

  return parts.join(" ");
}

/**
 * Capitalised Vietnamese words for `amount` VND, suffixed with "đồng".
 * Rounds like `formatVND` (the numeral printed beside it); a negative reads
 * "Âm …"; non-finite reads "Không đồng".
 */
export function vndInWords(amount: number): string {
  // Non-finite in = garbage upstream (a missing total_amount reaches here as
  // NaN). Guard first: Infinity used to spin the group loop forever (Infinity %
  // 1000 is NaN and Infinity / 1000 is still Infinity), hanging whatever was
  // rendering the contract.
  if (!Number.isFinite(amount)) return "Không đồng";

  // Round, don't floor, and keep the sign: these words are printed right next
  // to formatVND(amount), which rounds and prints "-". Flooring made 1500.9
  // read "một nghìn năm trăm" beside the numeral "1.501 ₫".
  const rounded = Math.round(amount);
  const value = Math.abs(rounded);
  if (value === 0) return "Không đồng";

  // Split into 3-digit groups, least-significant first.
  const groups: number[] = [];
  let remaining = value;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const mostSignificant = groups.length - 1;
  const spoken: string[] = [];
  for (let i = mostSignificant; i >= 0; i--) {
    if (groups[i] === 0) continue; // skip empty groups (e.g. "một triệu")
    const words = readGroup(groups[i], i !== mostSignificant);
    spoken.push(`${words} ${SCALES[i]}`.trim());
  }

  const sentence = `${rounded < 0 ? "âm " : ""}${spoken.join(" ")} đồng`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
