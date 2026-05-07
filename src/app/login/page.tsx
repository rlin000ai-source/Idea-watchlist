"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/list?token=${encodeURIComponent(token)}`);
      if (res.status === 401) {
        setError("Wrong token");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(`Server error: ${res.status}`);
        setLoading(false);
        return;
      }
      localStorage.setItem("watchlist_token", token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Network error");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form
        onSubmit={submit}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: 32,
          borderRadius: 4,
          width: "100%",
          maxWidth: 400,
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Watchlist
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>Authentication</h1>
        </div>
        <label style={{ display: "block", marginBottom: 8, color: "var(--text-sec)", fontSize: 12 }}>
          Token
        </label>
        <input
          className="mono"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            borderRadius: 4,
            marginBottom: 16,
          }}
        />
        {error && (
          <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 16 }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={loading || !token}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: token ? "var(--accent)" : "var(--surface-2)",
            color: "var(--text)",
            border: "none",
            borderRadius: 4,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Verifying…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
