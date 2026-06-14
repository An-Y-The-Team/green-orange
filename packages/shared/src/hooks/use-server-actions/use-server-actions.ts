import { useEffect, useState } from "react";
import { toast } from "sonner";

import { buildServerActionErrorMessage } from "../../utils/build-server-action-error-message/build-server-action-error-message";

export interface ServerActionState {
  success: boolean;
  message?: string | null;
  errors?: Record<string, string[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

interface UseServerActionOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (data?: any) => void;
  onError?: (error: string) => void;
  initialState?: unknown;
  successToastTitle?: string;
  errorToastTitle?: string;
  silent?: boolean;
}

export function useServerAction<T extends ServerActionState>(
  serverState: T,
  isPending: boolean,
  options: UseServerActionOptions = {}
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
