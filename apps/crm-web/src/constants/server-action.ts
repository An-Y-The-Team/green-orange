import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

/** Neutral starting state for every `useActionState` in the app. */
export const INITIAL_ACTION_STATE: ServerActionState = { success: false };

/** The standard Vietnamese toast pair, spread into `useServerAction` options. */
export const ACTION_TOAST_TITLES = {
  successToastTitle: "Thành công",
  errorToastTitle: "Lỗi",
};
