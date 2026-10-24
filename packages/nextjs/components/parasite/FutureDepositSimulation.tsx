"use client";

import { useState } from "react";
import { useLocale } from "./LocaleProvider";
import { formatUnits, maxUint256 } from "viem";
import { amount } from "~~/lib/parasite/formatting";
import { futureExposure, parseDeposit } from "~~/lib/parasite/futureExposure";
import type { Permission } from "~~/lib/parasite/types";

export function FutureDepositSimulation({ permission: p }: { permission: Permission }) {
  const { t } = useLocale();
  const [input, setInput] = useState("0");
  const parsed = parseDeposit(input, p.decimals);
  const overflow = parsed.value !== undefined && p.balance !== null && p.balance + parsed.value > maxUint256;
  const error = parsed.error ?? (overflow ? "OVERFLOW" : undefined);
  const projection = parsed.value !== undefined && !error ? futureExposure(p.balance, p.allowance, parsed.value) : null;
  const base = p.balance !== null && p.balance > 0n ? p.balance : 10n ** BigInt(p.decimals ?? 0);
  const proportion = parsed.value !== undefined ? (parsed.value * 100n) / base : 0n;
  const slider = Number(proportion > 200n ? 200n : proportion);
  const percent =
    projection?.balance && projection.exposure !== null
      ? Number((projection.exposure * 10000n) / projection.balance) / 100
      : 0;
  const messages = {
    INVALID_AMOUNT: "Enter a non-negative decimal amount. Use a dot for decimals.",
    PRECISION: "This amount exceeds the available token precision. No rounding was applied.",
    OVERFLOW: "The hypothetical balance would exceed the token's uint256 limit.",
  };
  return (
    <div className="future-deposit">
      <div className="eyebrow">{t("WHAT IF YOU DEPOSIT MORE?")}</div>
      <p>{t("Even after you stop using a dApp, its allowance may cover your next deposit.")}</p>
      <label htmlFor="future-deposit-amount">
        {t("Hypothetical deposit")} · {p.decimals === null ? t("raw units") : p.symbol}
      </label>
      <input
        id="future-deposit-amount"
        type="text"
        inputMode={p.decimals === null ? "numeric" : "decimal"}
        maxLength={400}
        value={input}
        onChange={event => {
          setInput(event.target.value);
        }}
        aria-invalid={!!error}
        aria-describedby="future-assumptions future-input-status"
      />
      <label className="micro" htmlFor="future-deposit-range">
        {t("Adjust the hypothetical deposit")}
      </label>
      <input
        id="future-deposit-range"
        type="range"
        min="0"
        max="200"
        step="1"
        value={slider}
        aria-valuetext={
          parsed.value !== undefined ? `${amount(parsed.value, p.decimals)} ${p.symbol}` : t("Invalid amount")
        }
        onChange={event => {
          const step = Number(event.target.value);
          const desired = (base * BigInt(step)) / 100n;
          const remaining = maxUint256 - (p.balance ?? 0n);
          const value = desired < remaining ? desired : remaining;
          setInput(p.decimals === null ? value.toString() : formatUnits(value, p.decimals));
        }}
      />
      <p id="future-input-status" className="warning" role="status">
        {error ? t(messages[error]) : ""}
      </p>
      {projection !== null && projection.exposure !== null && (
        <div className="exposure-track hypothetical-track" role="img" aria-label={t("Hypothetical allowance coverage")}>
          <div style={{ width: `${percent}%` }} />
        </div>
      )}
      <dl className="future-stats" aria-live="polite" aria-atomic="true">
        <div>
          <dt>{t("HYPOTHETICAL BALANCE")}</dt>
          <dd>{t(amount(projection?.balance ?? null, p.decimals))}</dd>
        </div>
        <div>
          <dt>{t("HYPOTHETICAL ACCESS SCOPE")}</dt>
          <dd className="pink">{t(amount(projection?.exposure ?? null, p.decimals))}</dd>
        </div>
        <div>
          <dt>{t("ADDITIONAL ACCESS SCOPE")}</dt>
          <dd>{t(amount(projection?.additionalExposure ?? null, p.decimals))}</dd>
        </div>
        <div>
          <dt>{t("OUTSIDE THIS ALLOWANCE")}</dt>
          <dd>{t(amount(projection?.outside ?? null, p.decimals))}</dd>
        </div>
      </dl>
      <p className="micro" id="future-assumptions">
        {t(
          "SIMULATION ONLY. Assumes the verified allowance stays unchanged and no tokens are spent before the deposit. Current verified wallet data is unchanged. Authorization scope does not prove withdrawal capability or predict loss.",
        )}
      </p>
      {p.balance === null && (
        <p className="warning">
          {t("Current balance is unavailable. Future exposure remains unknown; it is not assumed to be zero.")}
        </p>
      )}
      {p.decimals === null && (
        <p className="micro">{t("Token precision is unavailable. Enter whole raw units only.")}</p>
      )}
    </div>
  );
}
