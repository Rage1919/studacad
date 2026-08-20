"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AccountNav({ className = "login" }: { className?: string }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STUDACAD_STATIC_PREVIEW === "true") return;
    void fetch("/api/auth/me", { cache: "no-store" }).then(response => setSignedIn(response.ok)).catch(() => setSignedIn(false));
  }, []);
  return <Link className={className} href={signedIn ? "/account" : "/login"}>↪ <span>{signedIn ? "Account" : "Log in"}</span></Link>;
}
