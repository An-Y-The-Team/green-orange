export const formatDurationFromMs = (milliseconds: number): string => {
  if (typeof milliseconds !== "number") {
    throw new TypeError("Value must be a number");
  }

  if (milliseconds < 0) {
    throw new Error("Value must be non-negative");
  }

  if (Number.isNaN(milliseconds)) {
    throw new Error("Value cannot be NaN");
  }

  if (!Number.isFinite(milliseconds)) {
    throw new Error("Value cannot be Infinity");
  }

  const totalSeconds = milliseconds / 1000;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const fractionalSeconds = Math.floor((totalSeconds % 1) * 10) / 10;

  // Check if we need to show hours
  if (totalMinutes >= 60) {
    // Show HH:MM:SS.s format
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const hoursStr = hours.toString().padStart(2, "0");
    const minutesStr = minutes.toString().padStart(2, "0");
    const secondsStr = seconds.toString().padStart(2, "0");
    const fractionalStr = fractionalSeconds.toFixed(1).slice(1);

    return `${hoursStr}:${minutesStr}:${secondsStr}${fractionalStr}`;
  } else {
    // Show MM:SS.s format
    const minutesStr = totalMinutes.toString().padStart(2, "0");
    const secondsStr = seconds.toString().padStart(2, "0");
    const fractionalStr = fractionalSeconds.toFixed(1).slice(1);

    return `${minutesStr}:${secondsStr}${fractionalStr}`;
  }
};
