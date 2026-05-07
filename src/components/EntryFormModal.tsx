"use client";
import { useState } from "react";
import type { Entry } from "@/lib/types";

export default function EntryFormModal({
  mode,
  token,
  entry,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  token: string;
  entry?: Entry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Entry>>(
    entry || {
      ticker: "",
      exchange: "NASDAQ",
      currency: "USD",
      analysis_date: new Date().toISOString().slice(0, 10),
      anchor_price: undefined,
      bull_target: undefined,
      base_target: undefined,
      bear_target: undefined,
      thesis_oneliner: "",
      catalysts: [],
    },
  );
  const [catalystText, setCatalystText] = useState((entry?.catalysts || []).join("\n"));
  const [tagText, setTagText] = useState((entry?.tags || []).join(", "));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Entry>(k: K, v: Entry[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const catalysts = catalystText.split("\n").map((s) => s.trim()).filter(Boolean);
    const tags = tagText.split(",").map((s) => s.trim()).filter(Boolean);

    const payload = { ...form, catalysts, tags } as Entry;

    try {
      const url = mode === "add" ? "/api/add" : "/api/update";
      const body =
        mode === "add"
          ? payload
          : {
              ticker: entry!.ticker,
              exchange: entry!.exchange,
              patch: payload,
            };
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.errors ? json.errors.join("; ") : json.error || "Save failed");
        setSaving(false);
        return;
      }
      onSaved();
    } catch (e: any) {
      setError(e.message || "Network error");
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          padding: 24,
          width: "100%",
          maxWidth: 600,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 500 }}>
            {mode === "add" ? "Add position" : `Edit ${entry?.ticker}`}
          </h2>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 18 }}>
            ×
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Ticker" required>
            <input
              className="mono"
              required
              disabled={mode === "edit"}
              value={form.ticker || ""}
              onChange={(e) => update("ticker", e.target.value.toUpperCase())}
              style={inputStyle}
            />
          </Field>
          <Field label="Exchange" required>
            <input
              required
              disabled={mode === "edit"}
              value={form.exchange || ""}
              onChange={(e) => update("exchange", e.target.value.toUpperCase())}
              style={inputStyle}
            />
          </Field>
          <Field label="Currency" required>
            <select
              value={form.currency || "USD"}
              onChange={(e) => update("currency", e.target.value)}
              style={inputStyle}
            >
              <option>USD</option>
              <option>GBP</option>
              <option>GBp</option>
              <option>EUR</option>
              <option>AUD</option>
              <option>JPY</option>
              <option>HKD</option>
            </select>
          </Field>
          <Field label="Analysis Date" required>
            <input
              type="date"
              required
              value={form.analysis_date || ""}
              onChange={(e) => update("analysis_date", e.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Anchor" required>
            <input
              className="mono"
              type="number"
              step="0.01"
              required
              value={form.anchor_price ?? ""}
              onChange={(e) => update("anchor_price", parseFloat(e.target.value))}
              style={inputStyle}
            />
          </Field>
          <Field label="Bear" required>
            <input
              className="mono"
              type="number"
              step="0.01"
              required
              value={form.bear_target ?? ""}
              onChange={(e) => update("bear_target", parseFloat(e.target.value))}
              style={inputStyle}
            />
          </Field>
          <Field label="Base" required>
            <input
              className="mono"
              type="number"
              step="0.01"
              required
              value={form.base_target ?? ""}
              onChange={(e) => update("base_target", parseFloat(e.target.value))}
              style={inputStyle}
            />
          </Field>
          <Field label="Bull" required>
            <input
              className="mono"
              type="number"
              step="0.01"
              required
              value={form.bull_target ?? ""}
              onChange={(e) => update("bull_target", parseFloat(e.target.value))}
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label="Thesis (one line)" required>
          <textarea
            required
            rows={2}
            value={form.thesis_oneliner || ""}
            onChange={(e) => update("thesis_oneliner", e.target.value)}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>

        <Field label="Catalysts (one per line)" required>
          <textarea
            required
            rows={3}
            value={catalystText}
            onChange={(e) => setCatalystText(e.target.value)}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Q3 earnings (Aug 2026)&#10;Cost program update&#10;..."
          />
        </Field>

        <Field label="Tags (comma-separated)">
          <input
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            style={inputStyle}
            placeholder="value, energy, income"
          />
        </Field>

        <Field label="Source URL (optional)">
          <input
            value={form.source_url || ""}
            onChange={(e) => update("source_url", e.target.value)}
            style={inputStyle}
            placeholder="https://claude.ai/chat/..."
          />
        </Field>

        {error && <div style={{ color: "var(--red)", fontSize: 12, marginTop: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-sec)", borderRadius: 4 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: "8px 16px", background: "var(--accent)", border: "none", color: "var(--text)", borderRadius: 4, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : mode === "add" ? "Add" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: "block", fontSize: 11, color: "var(--text-sec)", marginBottom: 4, letterSpacing: 0.5 }}>
        {label} {required && <span style={{ color: "var(--red)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: 3,
  fontSize: 13,
};
