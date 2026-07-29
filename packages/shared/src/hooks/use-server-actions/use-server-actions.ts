import { useEffect, useState } from "react";
import { toast } from "sonner";

import { buildServerActionErrorMessage } from "../../utils/build-server-action-error-message/build-server-action-error-message";

/**
 * `TData` is the action's success payload. It defaults to `unknown` so an action
 * that declares nothing forces its consumer to narrow before reading fields.
 */
export interface ServerActionState<TData = unknown> {
  success: boolean;
  message?: string | null;
  errors?: Record<string, string[]>;
  data?: TData;
}

interface UseServerActionOptions<TData = unknown> {
  /**
   * Receives `ServerActionState.data`, typed by the state's `TData`. Declared
   * with method syntax on purpose: that makes the parameter bivariant, so a
   * caller whose action still resolves to `ServerActionState<unknown>` may
   * annotate a narrower payload (`onSuccess: (data: Project) => …`) instead of
   * narrowing. Actions that declare `ServerActionState<T>` get it checked.
   */
  onSuccess?(data?: TData): void;
  onError?: (error: string) => void;
  initialState?: unknown;
  successToastTitle?: string;
  errorToastTitle?: string;
  silent?: boolean;
}

export function useServerAction<TData = unknown>(
  serverState: ServerActionState<TData>,
  isPending: boolean,
  options: UseServerActionOptions<TData> = {}
) {
  const [actionProcessed, setActionProcessed] = useState(false);

  const {
    onSuccess,
    onError,
    initialState = {
      success: false,
      message: null,
      errors: {},
    },
    successToastTitle = "Success",
    errorToastTitle = "Error",
    silent,
  } = options;

  // Handle server response
  useEffect(() => {
    if (serverState.message && !actionProcessed) {
      if (serverState.success) {
        if (!silent)
          toast.success(successToastTitle, {
            id: "server-action-success",
            description: serverState.message,
          });
        onSuccess?.(serverState.data);
      } else {
        const errorMessage = buildServerActionErrorMessage({
          errors: serverState.errors,
          fallbackMessage: serverState.message,
        });

        // Only show default error toast if onError doesn't exist
        if (!onError) {
          toast.error(errorToastTitle, {
            description: errorMessage,
          });
        }
        onError?.(errorMessage);
      }
      // Reset state to initial state
      Object.assign(serverState, initialState);
      setActionProcessed(true);
    }
  }, [
    serverState,
    actionProcessed,
    onSuccess,
    onError,
    initialState,
    successToastTitle,
    errorToastTitle,
    silent,
  ]);

  // Reset flag for new submissions
  useEffect(() => {
    if (isPending || !serverState.message) {
      setActionProcessed(false);
    }
  }, [isPending, serverState.message]);

  return {
    actionProcessed,
    resetActionProcessed: () => setActionProcessed(false),
  };
}
