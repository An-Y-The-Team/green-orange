import dayjs from "../lib/dayjs";

export const YESTERDAY = "yesterday";
export const TWO_DAYS_AGO = "2 days ago";
export const EOD = "23:59";
export const DATE_FORMAT = "MMM D, YYYY h:mm A z";

export const getRelativeDateTime = (
  datetime: dayjs.Dayjs,
  timezone?: string
) => {
  let now = dayjs();
  let target = datetime;

  if (timezone) {
    try {
      now = dayjs().tz(timezone);
      target = datetime.tz(timezone);
    } catch (_error) {
      // Fallback to local time if timezone is invalid
      now = dayjs();
      target = datetime;
    }
  }

  // Normalize to start of day to calculate calendar day difference
  // .startOf('day') respects the timezone set on the dayjs object
  const diff = now.startOf("day").diff(target.startOf("day"), "day");

  if (diff === 1) {
    return YESTERDAY;
  } else if (diff === 2) {
    return TWO_DAYS_AGO;
  } else {
    return `on ${target.format(DATE_FORMAT)}`;
  }
};

export const TIME_FORMAT = {
  TWELVE_HOUR: "12h",
  TWENTY_FOUR_HOUR: "24h",
  TWELVE_HOUR_NO_MINUTES: "12h-no-minutes",
};

export const DEADLINE_FORMAT = "MMM D, YYYY [at] h A z";
