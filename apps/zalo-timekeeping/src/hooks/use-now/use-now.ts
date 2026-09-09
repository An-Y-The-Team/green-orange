import dayjs from "dayjs";
import { useSyncExternalStore } from "react";

// The wall clock as "HH:mm", re-rendering only when the minute changes. An
// external store, not useEffect + setInterval in the component (AGENTS.md).
// Display only — the API stamps the real time.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  timer ??= setInterval(() => listeners.forEach((notify) => notify()), 1000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
};

const getSnapshot = (): string => dayjs().format("HH:mm");

export const useNow = (): string =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
