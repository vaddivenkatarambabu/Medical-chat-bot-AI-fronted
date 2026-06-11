import { supabase } from "@/integrations/supabase/client";

const DEFAULT_DEV_BACKEND_URL = "http://127.0.0.1:1819";
const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? DEFAULT_DEV_BACKEND_URL : "")
).replace(/\/$/, "");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  if (!EMAIL_PATTERN.test(normalizeEmail(email))) {
    return "Enter a valid email address.";
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include letters and numbers.";
  }

  return null;
}

export function authRedirect(path: string): string {
  return `${window.location.origin}${path}`;
}

async function readAuthApiError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => undefined);
    const message = data?.error ?? data?.message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  const text = await response.text().catch(() => "");
  return text.trim() || `Request failed with status ${response.status}`;
}

async function postAuthEmail(
  path: string,
  email: string,
  redirectTo: string,
  options: { createUser?: boolean } = {},
) {
  if (!BACKEND_URL) {
    throw new Error("Backend URL is not configured.");
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: normalizeEmail(email),
      redirect_to: redirectTo,
      ...(options.createUser === undefined
        ? {}
        : {
            create_user: options.createUser,
          }),
    }),
  });

  if (!response.ok) {
    throw new Error(await readAuthApiError(response));
  }
}

export async function requestEmailOtp(
  email: string,
  redirectTo: string,
  options: { createUser?: boolean } = {},
): Promise<void> {
  await postAuthEmail("/api/auth/send-otp", email, redirectTo, options);
}

export async function requestPasswordRecovery(
  email: string,
  redirectTo: string,
): Promise<void> {
  await postAuthEmail("/api/auth/send-recovery", email, redirectTo);
}

export async function isCurrentUserEmailVerified(): Promise<boolean> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return false;
  }

  return Boolean(user.email_confirmed_at);
}

export async function syncBackendAuthSession(): Promise<void> {
  if (!BACKEND_URL) {
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return;
  }

  await fetch(`${BACKEND_URL}/api/auth/session`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  }).catch(() => undefined);
}

export async function revokeBackendAuthSession(): Promise<void> {
  if (!BACKEND_URL) {
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return;
  }

  await fetch(`${BACKEND_URL}/api/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  }).catch(() => undefined);
}
