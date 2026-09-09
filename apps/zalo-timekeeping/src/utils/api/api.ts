import { getAccessToken, getPhoneNumber } from "zmp-sdk/apis";

import { API_BASE, TOKEN_STORAGE_KEY } from "../../constants/config";
import type { CrewMe } from "../../types";

// Every sentence a failure can produce on the worker's phone lives here. A site
// has patchy signal, so the network path is the most common failure — it must
// never surface as the browser's English "Failed to fetch".
export const NETWORK_ERROR_MESSAGE =
  "Không có mạng. Kiểm tra kết nối rồi thử lại.";
const GENERIC_ERROR_MESSAGE = "Có lỗi xảy ra, vui lòng thử lại";
const LOGIN_FAILED_MESSAGE = "Đăng nhập Zalo thất bại, vui lòng thử lại";
const PHONE_PERMISSION_MESSAGE =
  "Bạn chưa cho phép Zalo chia sẻ số điện thoại. Bấm đăng nhập lại và chọn Cho phép.";

export class ApiError extends Error {
  status: number;

  constructor({ status, message }: { status: number; message: string }) {
    super(message);
    this.status = status;
  }
}

export const getToken = (): string | null =>
  localStorage.getItem(TOKEN_STORAGE_KEY);
export const clearToken = (): void =>
  localStorage.removeItem(TOKEN_STORAGE_KEY);

// Nest errors come as { statusCode, message } where message may be a
// class-validator string array — flatten to one displayable Vietnamese line.
const errorMessage = (body: unknown, fallback: string): string => {
  const message = (body as { message?: string | string[] })?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" && message ? message : fallback;
};

// The one place fetch is called: a thrown fetch (offline, DNS, CORS) and a
// non-JSON body both become an ApiError with a Vietnamese message, so callers
// can show `error.message` to the worker without checking what kind it is.
async function fetchJson({
  url,
  init,
  fallback,
}: {
  url: string;
  init: RequestInit;
  fallback: string;
}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError({ status: 0, message: NETWORK_ERROR_MESSAGE });
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      message: errorMessage(data, fallback),
    });
  }
  return data;
}

/**
 * JSON fetch against the CRM API with the crew Bearer attached. A 401 clears
 * the stored token — the caller's error path routes back to the login screen.
 */
export async function apiFetch<T>({
  path,
  method = "GET",
  body,
}: {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
}): Promise<T> {
  try {
    const data = await fetchJson({
      url: `${API_BASE}${path}`,
      init: {
        method,
        headers: {
          Authorization: `Bearer ${getToken() ?? ""}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
      fallback: GENERIC_ERROR_MESSAGE,
    });
    return data as T;
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 401) clearToken();
    throw caught;
  }
}

/**
 * Zalo login: getPhoneNumber() (permission prompt) + getAccessToken(), both
 * exchanged server-side for a crew JWT — the phone number itself never reaches
 * this client. 401 messages are shown to the worker verbatim.
 */
export async function login(): Promise<CrewMe["id"]> {
  let accessToken: string;
  let token: string | undefined;
  try {
    accessToken = await getAccessToken({});
    ({ token } = await getPhoneNumber({}));
  } catch {
    // The SDK rejects with its own object when the worker taps "Không cho phép";
    // its text is not for them — say what to do instead.
    throw new ApiError({ status: 0, message: PHONE_PERMISSION_MESSAGE });
  }
  const data = (await fetchJson({
    url: `${API_BASE}/auth/zalo-token`,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, access_token: accessToken }),
    },
    fallback: LOGIN_FAILED_MESSAGE,
  })) as { access_token: string; crew_member: { id: number } };
  localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
  return data.crew_member.id;
}
