"use client";

import { useAuth } from "./AuthProvider";

export function AccountNav({ className = "login" }: { className?: string }) {
  const { ready, signedIn } = useAuth();
  if (!ready) return null;
  if (signedIn)
    return (
      <a className={className} href="/account">
        ↪ <span>Account</span>
      </a>
    );
  return (
    <span className="auth-nav-guest">
      <a className={className} href="/login">
        <span>Log in</span>
      </a>
      <a className={`${className} register-link`} href="/register">
        <span>Register</span>
      </a>
    </span>
  );
}
