// Hours arrive from the API as decimals (8.75). Workers count in "giờ" and
// "phút", never in hundredths of an hour — this is the only formatter for them.
export function formatHours({ hours }: { hours: number }): string {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (wholeHours === 0) return `${minutes} phút`;
  if (minutes === 0) return `${wholeHours} giờ`;
  return `${wholeHours} giờ ${minutes} phút`;
}
