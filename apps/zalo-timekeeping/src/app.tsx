import { Suspense, useState } from "react";

import { ErrorBoundary } from "./components/error-boundary/error-boundary";
import { HistoryPage } from "./pages/history/history";
import { HomePage } from "./pages/home/home";
import { LoginPage } from "./pages/login/login";
import { getToken } from "./utils/api/api";
import { invalidate } from "./utils/query-cache/query-cache";

type PageName = "login" | "home" | "history";

// Three screens, plain state — no router. Boot reads the stored token
// synchronously; a stale token surfaces as a 401 on the first data load, which
// clears it and lands back here on login.
export function App() {
  const [page, setPage] = useState<PageName>(() =>
    getToken() ? "home" : "login"
  );

  const handleLoggedIn = () => setPage("home");
  const handleAuthLost = () => {
    invalidate();
    setPage("login");
  };
  const openHistory = () => setPage("history");
  const openHome = () => setPage("home");

  if (page === "login") {
    return <LoginPage onLoggedIn={handleLoggedIn} />;
  }

  return (
    <ErrorBoundary onAuthError={handleAuthLost}>
      <Suspense fallback={<p className="screen-message">Đang tải…</p>}>
        {page === "home" ? (
          <HomePage onOpenHistory={openHistory} onAuthLost={handleAuthLost} />
        ) : (
          <HistoryPage onBack={openHome} />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
