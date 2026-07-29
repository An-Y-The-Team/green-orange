import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

/**
 * Neutral starting state for every `useActionState` in the app.
 *
 * Typed **without** `data` on purpose. `ServerActionState` (i.e.
 * `ServerActionState<unknown>`) would pin `data?: unknown`, which is not
 * assignable to `ServerActionState<Project>` — so an action declaring a typed
 * payload could no longer start from this constant. Omitting the key makes it
 * assignable to every `ServerActionState<TData>` while `state.message` /
 * `state.errors` stay readable at the call site.
 */
export const INITIAL_ACTION_STATE: Omit<ServerActionState, "data"> = {
  success: false,
};

/** The standard Vietnamese toast pair, spread into `useServerAction` options. */
export const ACTION_TOAST_TITLES = {
  successToastTitle: "Thành công",
  errorToastTitle: "Lỗi",
};
