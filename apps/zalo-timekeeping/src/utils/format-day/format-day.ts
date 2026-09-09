import dayjs from "dayjs";

// "Thứ ba, 09/09/2026" — the weekday is what a worker checks first when asked
// "which day is this row?". Relies on dayjs.locale("vi") set in main.tsx.
export function formatDay({ date }: { date: string | Date }): string {
  const text = dayjs(date).format("dddd, DD/MM/YYYY");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
