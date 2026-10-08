import { useState } from "react";

import { login } from "../../utils/api/api";
import { invalidate } from "../../utils/query-cache/query-cache";

// getPhoneNumber() must run from a user gesture, so login is a button, not an
// auto-redirect. The purpose text is required by Zalo Mini App policy 3.3.4 —
// written in plain words, not policy words. The company name and support
// number are here because a reviewer blocked by the roster gate never sees
// another screen, and review criteria want the operator identifiable.
export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await login();
      invalidate(); // never serve another worker's cached data
      onLoggedIn();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Đăng nhập Zalo thất bại, vui lòng thử lại"
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
        Ứng dụng cần số điện thoại Zalo của bạn để biết bạn là ai trong công ty.
        Không dùng vào việc khác.
      </p>
      <button
        type="button"
        className="btn primary"
        disabled={busy}
        onClick={handleLogin}
      >
        {busy ? "Đang đăng nhập…" : "Đăng nhập bằng Zalo"}
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
