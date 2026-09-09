import { useState } from "react";

import { login } from "../../utils/api/api";
import { invalidate } from "../../utils/query-cache/query-cache";

// getPhoneNumber() must run from a user gesture, so login is a button, not an
// auto-redirect. The purpose text is required by Zalo Mini App policy 3.3.4.
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
      <h1>Chấm công</h1>
      <p>
        Ứng dụng dùng số điện thoại Zalo của bạn để nhận diện nhân sự đã đăng ký
        với công ty — không dùng cho mục đích nào khác.
      </p>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={handleLogin}
      >
        {busy ? "Đang đăng nhập…" : "Đăng nhập bằng Zalo"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
