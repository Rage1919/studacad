"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export function AccountNav({ className = "login" }: { className?: string }) {
  const { ready, signedIn } = useAuth();
  if (!ready) return null;
  if (signedIn)
    return (
      <Link className={className} href="/account">
        ↪ <span>Account</span>
      </Link>
    );
  return (
    <span className="auth-nav-guest">
      <Link className={className} href="/login">
        <span>Log in</span>
      </Link>
      <Link className={`${className} register-link`} href="/register">
        <span>Register</span>
      </Link>
    </span>
  );
}
