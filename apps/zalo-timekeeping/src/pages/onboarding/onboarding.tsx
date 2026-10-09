import { useState } from "react";

import { link } from "../../utils/api/api";
import { invalidate } from "../../utils/query-cache/query-cache";

/**
 * Shown only to someone Zalo has identified but the roster does not know yet.
 *
 * Deliberately NOT a login screen. Zalo already signed this person in, so a
 * "Đăng nhập với Zalo" button is both redundant and a policy violation — it is
 * what version 4 was rejected for. This is the "UI Onboarding" the platform
 * asks for when an app genuinely cannot work without a phone number: it says
 * why the number is needed and what it is used for, before any prompt.
 *
 * It is also the only screen a Zalo reviewer reaches, so it names the operator
 * and gives a contact.
 */
export function OnboardingPage({ onLinked }: { onLinked: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLink = async () => {
    setBusy(true);
    setError(null);
    try {
      await link();
      invalidate(); // never serve another worker's cached data
      onLinked();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Không liên kết được, thử lại"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen-message">
      <h1 className="page-title">Chấm công</h1>
      <p className="hint">CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ Ý ÂN</p>
      <p>
        Đây là ứng dụng chấm công nội bộ, dùng cho nhân sự của công ty. Để biết
        bạn là ai trong danh sách nhân sự, ứng dụng cần đối chiếu số điện thoại
        Zalo của bạn.
      </p>
      <p>
        Số điện thoại chỉ dùng để đối chiếu danh sách nhân sự và chấm công.
        Không dùng vị trí, camera hay danh bạ. Bạn chỉ cần làm bước này một lần.
      </p>
      <button
        type="button"
        className="btn primary"
        disabled={busy}
        onClick={handleLink}
      >
        {busy ? "Đang liên kết…" : "Liên kết tài khoản"}
      </button>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="hint">Hỗ trợ: 0773964407</p>
    </div>
  );
}
