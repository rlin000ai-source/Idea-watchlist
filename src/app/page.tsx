"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("watchlist_token") : null;
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--text-muted)" }}>
      Loading…
    </div>
  );
}
