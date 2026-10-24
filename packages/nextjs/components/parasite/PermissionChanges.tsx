"use client";

import { useEffect, useState } from "react";
import { useLocale } from "./LocaleProvider";
import { type PermissionChange, compareSnapshot, makeSnapshot, parseSnapshot } from "~~/lib/parasite/changes";
import type { Scan } from "~~/lib/parasite/types";

export function PermissionChanges({ owner, scan }: { owner: string; scan: Scan | null }) {
  const { t } = useLocale();
  const [enabled, setEnabled] = useState(false);
  const [changes, setChanges] = useState<PermissionChange[]>([]);
  const [error, setError] = useState("");
  const key = `parasite:observations:v1:10143:${owner.toLowerCase()}`;
  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(`${key}:enabled`) === "yes");
    } catch {
      setError("Browser storage is unavailable.");
    }
  }, [key]);
  useEffect(() => {
    if (!enabled || !scan) return;
    try {
      const saved = localStorage.getItem(key);
      const previous = saved ? parseSnapshot(saved, owner) : null;
      if (saved && !previous) {
        setError("Saved observations are invalid. Disable comparison to clear them.");
        return;
      }
      setChanges(previous ? compareSnapshot(previous, scan) : []);
      localStorage.setItem(key, JSON.stringify(makeSnapshot(owner, scan, previous ?? undefined)));
      setError("");
    } catch {
      setError("Browser storage is unavailable.");
    }
  }, [enabled, key, owner, scan]);
  return (
    <div className="permission-changes">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={event => {
            const next = event.target.checked;
            try {
              if (next) localStorage.setItem(`${key}:enabled`, "yes");
              else {
                localStorage.removeItem(`${key}:enabled`);
                localStorage.removeItem(key);
                setChanges([]);
                setError("");
              }
              setEnabled(next);
            } catch {
              setError("Browser storage is unavailable.");
            }
          }}
        />
        {t("COMPARE WITH MY PREVIOUS CHECK")}
      </label>
      <p className="micro">
        {t(
          "Optional public allowance snapshots stay in this browser. Checks run on refresh, not around the clock. Newly observed does not prove newly approved; read failures remain unresolved.",
        )}
      </p>
      {error && <p className="warning">{t(error)}</p>}
      {enabled && (
        <div aria-live="polite">
          {changes.length ? (
            changes.map(change => (
              <p key={change.key}>
                <strong>{t(change.kind)}</strong> · <code>{change.key}</code>
              </p>
            ))
          ) : (
            <p className="micro">
              {t("No verified changes to show. The first successful check establishes a baseline.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
