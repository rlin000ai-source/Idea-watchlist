"use client";
import type { EnrichedEntry, Grade } from "@/lib/types";

const GRADE_STYLES: Record<Grade, { bg: string; fg: string; label: string }> = {
  BULL_HIT: { bg: "rgba(139, 92, 246, 0.15)", fg: "var(--purple)", label: "BULL" },
  WIN: { bg: "rgba(16, 185, 129, 0.15)", fg: "var(--green)", label: "WIN" },
  NEUTRAL: { bg: "rgba(245, 158, 11, 0.15)", fg: "var(--amber)", label: "NEUTRAL" },
  MISS: { bg: "rgba(239, 68, 68, 0.15)", fg: "var(--red)", label: "MISS" },
  UNGRADED: { bg: "var(--surface-2)", fg: "var(--text-muted)", label: "—" },
};

function fmtPct(v: number | null): { text: string; color: string } {
  if (v === null) return { text: "—", color: "var(--text-muted)" };
  const pct = v * 100;
  const text = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  const color = pct > 0 ? "var(--green)" : pct < 0 ? "var(--red)" : "var(--text-sec)";
  return { text, color };
}

function fmtPrice(p: number | null, currency: string): string {
  if (p === null) return "—";
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : currency === "GBp" ? "" : "";
  const suffix = currency === "GBp" ? "p" : "";
  return `${sym}${p.toFixed(2)}${suffix}`;
}

export default function EntryRow({
  entry,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: {
  entry: EnrichedEntry;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const grade = GRADE_STYLES[entry.grade];
  const sr = fmtPct(entry.stock_return);
  const br = fmtPct(entry.benchmark_return);
  const er = fmtPct(entry.excess_return);

  return (
    <>
      <tr style={{ borderBottom: "1px solid var(--border)" }}>
        <td style={{ padding: "12px", cursor: "pointer" }} onClick={onToggleExpand}>
          <div style={{ fontWeight: 500 }}>{entry.ticker}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{entry.exchange}</div>
        </td>
        <td className="mono" style={{ padding: "12px", color: "var(--text-sec)", fontSize: 12 }}>
          {entry.analysis_date}
        </td>
        <td className="mono" style={{ padding: "12px", textAlign: "right" }}>
          {fmtPrice(entry.anchor_price, entry.currency)}
        </td>
        <td className="mono" style={{ padding: "12px", textAlign: "right" }}>
          {fmtPrice(entry.current_price, entry.currency)}
        </td>
        <td className="mono" style={{ padding: "12px", textAlign: "right", color: sr.color }}>
          {sr.text}
        </td>
        <td className="mono" style={{ padding: "12px", textAlign: "right", color: br.color }}>
          {br.text}
        </td>
        <td className="mono" style={{ padding: "12px", textAlign: "right", color: er.color, fontWeight: 500 }}>
          {er.text}
        </td>
        <td style={{ padding: "12px", textAlign: "center" }}>
          <span
            style={{
              display: "inline-block",
              padding: "3px 10px",
              fontSize: 10,
              letterSpacing: 1,
              fontWeight: 500,
              background: grade.bg,
              color: grade.fg,
              borderRadius: 3,
            }}
          >
            {grade.label}
          </span>
        </td>
        <td style={{ padding: "12px", textAlign: "right", whiteSpace: "nowrap" }}>
          <button onClick={onEdit} style={btnStyle}>Edit</button>
          <button onClick={onDelete} style={{ ...btnStyle, color: "var(--red)" }}>×</button>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
          <td colSpan={9} style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
                  Thesis
                </div>
                <div style={{ fontSize: 13, marginBottom: 12 }}>{entry.thesis_oneliner}</div>
                <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
                  Catalysts
                </div>
                <ul style={{ paddingLeft: 16, fontSize: 12 }}>
                  {entry.catalysts.map((c, i) => (
                    <li key={i} style={{ marginBottom: 2 }}>{c}</li>
                  ))}
                </ul>
                {entry.source_url && (
                  <div style={{ marginTop: 12, fontSize: 11 }}>
                    <a href={entry.source_url} target="_blank" rel="noreferrer">Source →</a>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                  Price Target Ladder
                </div>
                <PriceLadder entry={entry} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const btnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--text-sec)",
  padding: "4px 10px",
  borderRadius: 3,
  fontSize: 11,
  marginLeft: 4,
};

function PriceLadder({ entry }: { entry: EnrichedEntry }) {
  const cur = entry.current_price;
  const items = [
    { label: "BULL", price: entry.bull_target, color: "var(--purple)" },
    { label: "BASE", price: entry.base_target, color: "var(--green)" },
    { label: "ANCHOR", price: entry.anchor_price, color: "var(--text-sec)" },
    { label: "BEAR", price: entry.bear_target, color: "var(--red)" },
  ];
  const sorted = [...items].sort((a, b) => b.price - a.price);
  return (
    <div className="mono" style={{ fontSize: 12 }}>
      {sorted.map((it) => {
        const isCurrentNear =
          cur !== null &&
          Math.abs(cur - it.price) <
            Math.min(...sorted.map((x) => (cur !== null ? Math.abs(cur - x.price) : Infinity)));
        return (
          <div
            key={it.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderTop: "1px dashed var(--border)",
            }}
          >
            <span style={{ color: it.color }}>{it.label}</span>
            <span>{fmtPrice(it.price, entry.currency)}</span>
          </div>
        );
      })}
      {cur !== null && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0 4px",
            marginTop: 4,
            borderTop: "1px solid var(--accent)",
            color: "var(--accent)",
            fontWeight: 500,
          }}
        >
          <span>CURRENT</span>
          <span>{fmtPrice(cur, entry.currency)}</span>
        </div>
      )}
    </div>
  );
}
