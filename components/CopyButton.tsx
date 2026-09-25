"use client";

import { useState } from "react";
import { btn } from "./ui";

export function CopyButton({ text, label = "Copy", className = btn.small }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older/in-app browsers (e.g. WhatsApp's webview)
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" onClick={copy} className={className} aria-live="polite">
      {copied ? "✓ Copied" : label}
    </button>
  );
}

/** A link shown in a read-only box with a copy button next to it. */
export function LinkBox({ label, url, hint }: { label: string; url: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-900">{label}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          aria-label={label}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
        />
        <CopyButton text={url} />
      </div>
    </div>
  );
}
