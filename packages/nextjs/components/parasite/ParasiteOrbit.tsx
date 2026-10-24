import { useState } from "react";
import { useLocale } from "./LocaleProvider";
import { ParasiteCreature } from "./ParasiteCreature";
import { WalletCore } from "./WalletCore";
import type { Permission } from "~~/lib/parasite/types";

export function ParasiteOrbit({
  permissions,
  selected,
  onSelect,
  simulation = false,
  scanning = false,
}: {
  permissions: Permission[];
  selected?: string;
  onSelect: (p: Permission) => void;
  simulation?: boolean;
  scanning?: boolean;
}) {
  const { t } = useLocale();
  const [replay, setReplay] = useState(0);
  const visibleCount = Math.min(permissions.length, 6);
  const angleFor = (index: number) => index * (360 / Math.max(visibleCount, 1)) - (visibleCount === 2 ? 35 : 90);
  return (
    <div className={`xray-field anatomical-xray ${scanning ? "is-reading" : ""}`} aria-busy={scanning}>
      <div key={`${replay}:${scanning}`} className="xray-imaging" aria-hidden="true">
        <div className="xray-scan-plane" />
        <div className="xray-crosshair crosshair-a" />
        <div className="xray-crosshair crosshair-b" />
        <div className="xray-reticle">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="xray-readout">
        <span className="imaging-label">{t("PERMISSION ANATOMY")}</span>
        <strong role="status">{t(scanning ? "READING SUPPORTED CONTRACTS…" : "X-RAY VISUALIZATION")}</strong>
        <span>
          {t(
            simulation
              ? "SIMULATION — NO LIVE WALLET DATA"
              : "Animation illustrates access. Contract reads determine the results.",
          )}
        </span>
        <button className="xray-replay" disabled={scanning} onClick={() => setReplay(value => value + 1)}>
          {t("REPLAY X-RAY")}
        </button>
      </div>
      <div className="field-coordinate coord-top">
        {" "}
        {t("PERMISSION FIELD /")} {simulation ? t("ILLUSTRATIVE") : t("VERIFIED READS")}
      </div>
      <div className="radar-ring ring-a" />
      <div className="radar-ring ring-b" />
      <div className="radar-ring ring-c" />
      <svg className="tendrils" viewBox="0 0 700 600" preserveAspectRatio="none" aria-hidden="true">
        {permissions.slice(0, 6).map((p, i) => {
          const angle = angleFor(i);
          const x = 350 + Math.cos((angle * Math.PI) / 180) * 235,
            y = 300 + Math.sin((angle * Math.PI) / 180) * 200;
          return (
            <g key={p.key} className={selected === p.key ? "tendril-selected" : ""}>
              <path
                d={`M350 300 Q${x - 65} ${y + 65} ${x} ${y}`}
                stroke={p.unlimited ? "#ec4a8a" : "#e8ad60"}
                strokeOpacity=".4"
                fill="none"
                strokeWidth="2"
              />
              <path
                className="tendril-signal"
                d={`M350 300 Q${x - 65} ${y + 65} ${x} ${y}`}
                stroke={p.unlimited ? "#ffb4d8" : "#ffe2a5"}
                fill="none"
                strokeWidth="2"
                strokeDasharray="3 34"
              />
            </g>
          );
        })}
      </svg>
      <WalletCore infected={permissions.length > 0} />
      <div className="orbit-creatures">
        {permissions.slice(0, 6).map((p, i) => {
          const angle = angleFor(i);
          return (
            <button
              key={p.key}
              className={`parasite-node ${selected === p.key ? "selected" : ""}`}
              style={{
                left: `${50 + Math.cos((angle * Math.PI) / 180) * 34}%`,
                top: `${50 + Math.sin((angle * Math.PI) / 180) * 34}%`,
              }}
              onClick={() => onSelect(p)}
              aria-label={`${t(p.name)} · ${t(p.category)}`}
            >
              <ParasiteCreature seed={p.key} tone={p.unlimited ? "pink" : "amber"} />
              <span>{t(p.name)}</span>
              <small>
                {p.unlimited ? t("UNLIMITED") : t("LIMITED")} · {p.symbol}
              </small>
            </button>
          );
        })}
      </div>
      {!permissions.length && (
        <div className="field-empty">
          {" "}
          {t("NO ACTIVE PARASITES DISPLAYED")}{" "}
          <span>{simulation ? t("Simulation complete") : t("Scan supported pairs to verify access")}</span>
        </div>
      )}
      <div className="field-coordinate coord-bottom">
        {" "}
        {t("10143 / MONAD TESTNET")} <span>{t("SELECT AN ORGANISM TO INSPECT ↗")}</span>
      </div>
    </div>
  );
}
