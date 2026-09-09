import { Suspense, useState } from "react";

import { ErrorBoundary } from "./components/error-boundary/error-boundary";
import { HistoryPage } from "./pages/history/history";
import { HomePage } from "./pages/home/home";
import { LoginPage } from "./pages/login/login";
import { RemedyPage } from "./pages/remedy/remedy";
import type { OpenShift } from "./types";
import { getToken } from "./utils/api/api";
import { invalidate } from "./utils/query-cache/query-cache";

enum PageName {
  LOGIN = "login",
  HOME = "home",
  HISTORY = "history",
  REMEDY = "remedy",
}

// Four screens, plain state — no router. Boot reads the stored token
// synchronously; a stale token surfaces as a 401 on the first data load, which
// clears it and lands back here on login.
export function App() {
  const [page, setPage] = useState<PageName>(() =>
    getToken() ? PageName.HOME : PageName.LOGIN
  );
  // Set when the remedy form is opened to close a shift they forgot to chấm
  // công ra: the project, date and stamped start are then fixed, and only the
  // giờ ra is theirs to claim.
  const [shiftToClose, setShiftToClose] = useState<OpenShift | null>(null);

  const handleLoggedIn = () => setPage(PageName.HOME);

  const handleAuthLost = () => {
    invalidate();
    setPage(PageName.LOGIN);
  };

  const openHistory = () => setPage(PageName.HISTORY);

  const openHome = () => {
    setShiftToClose(null);
    setPage(PageName.HOME);
  };

  // `shift` is null for an ordinary "tôi quên chấm công" on some past day.
  const openRemedy = (shift: OpenShift | null) => {
    setShiftToClose(shift);
    setPage(PageName.REMEDY);
  };

  if (page === PageName.LOGIN) {
    return <LoginPage onLoggedIn={handleLoggedIn} />;
  }

  return (
    <ErrorBoundary onAuthError={handleAuthLost}>
      <Suspense fallback={<p className="screen-message">Đang tải…</p>}>
        {page === PageName.HOME ? (
          <HomePage
            onOpenHistory={openHistory}
            onOpenRemedy={openRemedy}
            onAuthLost={handleAuthLost}
          />
        ) : page === PageName.REMEDY ? (
          <RemedyPage
            shiftToClose={shiftToClose}
            onDone={openHome}
            onBack={openHome}
            onAuthLost={handleAuthLost}
          />
        ) : (
          <HistoryPage onBack={openHome} />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
