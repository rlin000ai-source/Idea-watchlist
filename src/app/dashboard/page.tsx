"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EnrichedEntry, Grade } from "@/lib/types";
import EntryFormModal from "@/components/EntryFormModal";
import ExcessReturnChart from "@/components/ExcessReturnChart";
import EntryRow from "@/components/EntryRow";

type Filter = "all" | "WIN" | "BULL_HIT" | "NEUTRAL" | "MISS" | "UNGRADED";
type SortKey = "ticker" | "excess_return" | "stock_return" | "analysis_date";

export default function Dashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<{
    entries: EnrichedEntry[];
    fetched_at: string;
    last_updated: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("excess_return");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EnrichedEntry | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("watchlist_token");
    if (!t) {
      router.replace("/login");
      return;
    }
    setToken(t);
  }, [router]);

  async function load(t: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/list?token=${encodeURIComponent(t)}`);
      if (res.status === 401) {
        localStorage.removeItem("watchlist_token");
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setError(`Server error: ${res.status}`);
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "Load failed");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (token) load(token);
  }, [token]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.entries;
    if (filter !== "all") rows = rows.filter((r) => r.grade === filter);
    rows = [...rows].sort((a, b) => {
      let av: any = a[sortKey as keyof EnrichedEntry];
      let bv: any = b[sortKey as keyof EnrichedEntry];
      if (av === null || av === undefined) av = sortDir === "desc" ? -Infinity : Infinity;
      if (bv === null || bv === undefined) bv = sortDir === "desc" ? -Infinity : Infinity;
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [data, filter, sortKey, sortDir]);

  const counts = useMemo(() => {
    if (!data) return { all: 0, WIN: 0, BULL_HIT: 0, NEUTRAL: 0, MISS: 0, UNGRADED: 0 };
    const c: Record<string, number> = { all: data.entries.length, WIN: 0, BULL_HIT: 0, NEUTRAL: 0, MISS: 0, UNGRADED: 0 };
    for (const e of data.entries) c[e.grade] = (c[e.grade] || 0) + 1;
    return c as any;
  }, [data]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  async function handleDelete(ticker: string, exchange: string) {
    if (!token) return;
    if (!confirm(`Remove ${ticker} (${exchange})?`)) return;
    const res = await fetch("/api/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ticker, exchange }),
    });
    if (!res.ok) {
      alert(`Remove failed: ${res.status}`);
      return;
    }
    await load(token);
  }

  function logout() {
    localStorage.removeItem("watchlist_token");
    router.replace("/login");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--text-muted)" }}>
        Loading watchlist…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--red)" }}>
        {error}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px 64px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
              Equity Watchlist
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 500 }}>
              {data.entries.length} {data.entries.length === 1 ? "position" : "positions"}
            </h1>
            <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              Updated {data.last_updated} · Fetched {new Date(data.fetched_at).toLocaleString()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ padding: "8px 16px", background: "var(--accent)", color: "var(--text)", border: "none", borderRadius: 4 }}
            >
              + Add
            </button>
            <button
              onClick={() => token && load(token)}
              style={{ padding: "8px 16px", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 4 }}
            >
              Refresh
            </button>
            <button
              onClick={logout}
              style={{ padding: "8px 16px", background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 4 }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { k: "all", label: "All", color: "var(--text-sec)" },
            { k: "BULL_HIT", label: "Bull Hit", color: "var(--purple)" },
            { k: "WIN", label: "Win", color: "var(--green)" },
            { k: "NEUTRAL", label: "Neutral", color: "var(--amber)" },
            { k: "MISS", label: "Miss", color: "var(--red)" },
            { k: "UNGRADED", label: "Ungraded", color: "var(--text-muted)" },
          ].map(({ k, label, color }) => (
            <button
              key={k}
              onClick={() => setFilter(k as Filter)}
              style={{
                padding: "6px 12px",
                background: filter === k ? "var(--surface)" : "transparent",
                color: filter === k ? color : "var(--text-sec)",
                border: `1px solid ${filter === k ? color : "var(--border)"}`,
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              {label} ({counts[k]})
            </button>
          ))}
        </div>

        {/* Excess return chart */}
        {data.entries.length > 0 && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: 16, marginBottom: 24, borderRadius: 4 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>
              Excess Return vs Benchmark
            </div>
            <ExcessReturnChart entries={filtered} />
          </div>
        )}

        {/* Table */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                  <Th onClick={() => toggleSort("ticker")} active={sortKey === "ticker"} dir={sortDir}>Ticker</Th>
                  <Th onClick={() => toggleSort("analysis_date")} active={sortKey === "analysis_date"} dir={sortDir}>Date</Th>
                  <Th align="right">Anchor</Th>
                  <Th align="right">Current</Th>
                  <Th align="right" onClick={() => toggleSort("stock_return")} active={sortKey === "stock_return"} dir={sortDir}>Return</Th>
                  <Th align="right">Bench</Th>
                  <Th align="right" onClick={() => toggleSort("excess_return")} active={sortKey === "excess_return"} dir={sortDir}>Excess</Th>
                  <Th align="center">Grade</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <EntryRow
                    key={`${e.ticker}-${e.exchange}`}
                    entry={e}
                    expanded={expanded === `${e.ticker}-${e.exchange}`}
                    onToggleExpand={() =>
                      setExpanded(
                        expanded === `${e.ticker}-${e.exchange}` ? null : `${e.ticker}-${e.exchange}`,
                      )
                    }
                    onEdit={() => setEditingEntry(e)}
                    onDelete={() => handleDelete(e.ticker, e.exchange)}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
                      {data.entries.length === 0 ? "No positions yet — click + Add to start" : "No positions match this filter"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 24, textAlign: "center" }}>
          Not investment advice. Performance vs targets is mechanical, not adjusted for dividends, splits, or position sizing. Prices via Yahoo Finance.
        </div>
      </div>

      {showAddModal && token && (
        <EntryFormModal
          mode="add"
          token={token}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            load(token);
          }}
        />
      )}
      {editingEntry && token && (
        <EntryFormModal
          mode="edit"
          token={token}
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null);
            load(token);
          }}
        />
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  onClick?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
}) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: "10px 12px",
        textAlign: align,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: active ? "var(--text)" : "var(--text-sec)",
        fontWeight: 500,
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
      {active && <span style={{ marginLeft: 4 }}>{dir === "asc" ? "↑" : "↓"}</span>}
    </th>
  );
}
