import { Component, type ReactNode } from "react";

import { ApiError } from "../../utils/api/api";
import { invalidate } from "../../utils/query-cache/query-cache";

// Catches rejections surfaced by `use()`. A 401 (token expired/cleared) hands
// control back to the app so it can show the login screen; anything else gets
// a retry that clears the promise cache.
export class ErrorBoundary extends Component<
  { onAuthError: () => void; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (error instanceof ApiError && error.status === 401) {
      this.props.onAuthError();
    }
  }

  // Retry — drop every cached promise so the suspended reads re-fetch.
  handleRetry = () => {
    invalidate();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="screen-message">
          <p>{(error as Error).message}</p>
          <button type="button" className="btn" onClick={this.handleRetry}>
            Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
