import { getAccessToken, getPhoneNumber } from "zmp-sdk/apis";

import { API_BASE, TOKEN_STORAGE_KEY } from "../../constants/config";
import type { CrewMe } from "../../types";

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
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getToken() ?? ""}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    if (response.status === 401) clearToken();
    const parsed: unknown = await response.json().catch(() => null);
    throw new ApiError({
      status: response.status,
      message: errorMessage(parsed, "Có lỗi xảy ra, vui lòng thử lại"),
    });
  }
  return (await response.json()) as T;
}

/**
 * Zalo login: getPhoneNumber() (permission prompt) + getAccessToken(), both
 * exchanged server-side for a crew JWT — the phone number itself never reaches
 * this client. 401 messages are shown to the worker verbatim.
 */
export async function login(): Promise<CrewMe["id"]> {
  const accessToken = await getAccessToken({});
  const { token } = await getPhoneNumber({});
  const response = await fetch(`${API_BASE}/auth/zalo-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, access_token: accessToken }),
  });
  const parsed: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      message: errorMessage(
        parsed,
        "Đăng nhập Zalo thất bại, vui lòng thử lại"
      ),
    });
  }
  const data = parsed as { access_token: string; crew_member: { id: number } };
  localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
  return data.crew_member.id;
}
