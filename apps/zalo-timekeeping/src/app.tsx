import { Suspense, use, useState } from "react";

import { ErrorBoundary } from "./components/error-boundary/error-boundary";
import { HistoryPage } from "./pages/history/history";
import { HomePage } from "./pages/home/home";
import { OnboardingPage } from "./pages/onboarding/onboarding";
import { RemedyPage } from "./pages/remedy/remedy";
import type { OpenShift, RemedyPrefill } from "./types";
import { clearToken, identify } from "./utils/api/api";
import { cachedFetch, invalidate } from "./utils/query-cache/query-cache";

enum PageName {
  HOME = "home",
  HISTORY = "history",
  REMEDY = "remedy",
}

const REMEDY_SENT_MESSAGE = "Đã gửi đơn bù công. Văn phòng sẽ duyệt.";

/**
 * Zalo has already signed this person in, so the app never shows a login
 * screen: it asks who they are from the access token and renders straight into
 * the shell. Only someone the roster does not know yet sees onboarding.
 *
 * `use()` + the promise cache rather than useEffect (AGENTS.md), so the first
 * open suspends on the identify call instead of flashing an empty screen.
 */
export function App() {
  return (
    <Suspense fallback={<p className="screen-message">Đang mở ứng dụng…</p>}>
      <Session />
    </Suspense>
  );
}

function Session() {
  const identified = use(cachedFetch("session", identify));
  // `use()` gives the answer on first open; the state carries a link that
  // happens later, from the onboarding button's own handler.
  const [linked, setLinked] = useState(identified);
  if (!linked) return <OnboardingPage onLinked={() => setLinked(true)} />;
  return <Shell onUnlinked={() => setLinked(false)} />;
}

// Three screens, plain state — no router. A stale or revoked crew token
// surfaces as a 401 on the first data load, which clears it and drops back to
// onboarding.
function Shell({ onUnlinked }: { onUnlinked: () => void }) {
  const [page, setPage] = useState<PageName>(PageName.HOME);
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

  // A stale or revoked crew token: drop it, forget the cached session so the
  // next open re-identifies, and fall back to onboarding rather than a dead end.
  const handleAuthLost = () => {
    clearToken();
    invalidate();
    setFlash(null);
    onUnlinked();
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
