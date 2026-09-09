import { Suspense, useState } from "react";

import { ErrorBoundary } from "./components/error-boundary/error-boundary";
import { HistoryPage } from "./pages/history/history";
import { HomePage } from "./pages/home/home";
import { LoginPage } from "./pages/login/login";
import { RemedyPage } from "./pages/remedy/remedy";
import type { OpenShift, RemedyPrefill } from "./types";
import { getToken } from "./utils/api/api";
import { invalidate } from "./utils/query-cache/query-cache";

enum PageName {
  LOGIN = "login",
  HOME = "home",
  HISTORY = "history",
  REMEDY = "remedy",
}

const REMEDY_SENT_MESSAGE = "Đã gửi đơn bù công. Văn phòng sẽ duyệt.";

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
  // Set when resubmitting a rejected day from history.
  const [prefill, setPrefill] = useState<RemedyPrefill | null>(null);
  // One-shot confirmation shown at the top of Home after a write succeeded. A
  // new process needs an explicit "it recorded" — a silently changed screen
  // reads as "did it work?". Cleared on any navigation.
  const [flash, setFlash] = useState<string | null>(null);

  const handleLoggedIn = () => {
    setFlash(null);
    setPage(PageName.HOME);
  };

  const handleAuthLost = () => {
    invalidate();
    setFlash(null);
    setPage(PageName.LOGIN);
  };

  const openHistory = () => {
    setFlash(null);
    setPage(PageName.HISTORY);
  };

  const goHome = ({ message = null }: { message?: string | null } = {}) => {
    setShiftToClose(null);
    setPrefill(null);
    setFlash(message);
    setPage(PageName.HOME);
  };

  const handleBack = () => goHome();
  const handleRemedyDone = () => goHome({ message: REMEDY_SENT_MESSAGE });
  const handleFlash = ({ message }: { message: string }) => setFlash(message);

  // `shift` is null for an ordinary "báo quên chấm công" on some past day.
  const openRemedy = ({ shift }: { shift: OpenShift | null }) => {
    setShiftToClose(shift);
    setPrefill(null);
    setFlash(null);
    setPage(PageName.REMEDY);
  };

  const openResubmit = ({ prefill: next }: { prefill: RemedyPrefill }) => {
    setShiftToClose(null);
    setPrefill(next);
    setFlash(null);
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
            flash={flash}
            onFlash={handleFlash}
            onOpenHistory={openHistory}
            onOpenRemedy={openRemedy}
            onAuthLost={handleAuthLost}
          />
        ) : page === PageName.REMEDY ? (
          <RemedyPage
            shiftToClose={shiftToClose}
            prefill={prefill}
            onDone={handleRemedyDone}
            onBack={handleBack}
            onAuthLost={handleAuthLost}
          />
        ) : (
          <HistoryPage onBack={handleBack} onResubmit={openResubmit} />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
