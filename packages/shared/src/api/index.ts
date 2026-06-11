// Client exports
export { api, ApiClient, isApiError, getApiErrorMessage } from "./client";
export type { ApiConfig, ApiError } from "./client";

// Plugin exports
export { addAuthHeaders, addDevLogging, addSentryTracking } from "./plugins";

// Provider exports
export { ApiProvider } from "./provider";

// Note: initializeApi is intentionally not exported as it should only be called
// internally by the ApiProvider
