/**
 * Today as a `YYYY-MM-DD` string — the wire format every date column uses.
 * Passed as a lazy `useState` initializer, so it's a function, not a constant.
 */
export const todayISO = () => new Date().toISOString().slice(0, 10);
