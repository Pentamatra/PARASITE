import { useEffect, useRef } from "react";
import { FutureDepositSimulation } from "./FutureDepositSimulation";
import { useLocale } from "./LocaleProvider";
import { amount } from "~~/lib/parasite/formatting";
import type { Permission } from "~~/lib/parasite/types";

export function ExposureSimulation({
  permission: p,
  onClose,
  onRevoke,
  simulation,
  busy,
}: {
  permission: Permission;
  onClose: () => void;
  onRevoke: () => void;
  simulation: boolean;
  busy: boolean;
}) {
  const { t } = useLocale();
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, []);
  const percent = p.balance && p.exposure !== null ? Number((p.exposure * 10000n) / p.balance) / 100 : 0;
  return (
    <div className="parasite-modal-backdrop">
      <section
        ref={panelRef}
        className="exposure-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vision-title"
        onKeyDown={e => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const buttons = Array.from(
              panelRef.current?.querySelectorAll<HTMLElement>(
                "button:not(:disabled), input:not(:disabled), a[href], select:not(:disabled), textarea:not(:disabled)",
              ) || [],
            );
            const first = buttons[0],
              last = buttons[buttons.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <button autoFocus className="modal-close" onClick={onClose} aria-label={t("Close simulation")}>
          ✕
        </button>
        <div className="severity amber">{t("SIMULATION — NO FUNDS MOVED")}</div>
        <h2 id="vision-title">
          {" "}
          {t("See the scope.")} <br />
          <span className="muted">{t("Understand the exposure.")}</span>
        </h2>
        <p>{t("A mathematical illustration. No transaction or token transfer is executed.")}</p>
        <div className="exposure-track">
          <div style={{ width: `${percent}%` }} />
        </div>
        <div className="vision-stats">
          <div>
            <small>{t("WALLET BALANCE")}</small>
            <strong>{t(amount(p.balance, p.decimals))}</strong>
          </div>
          <div>
            <small>{t("POTENTIALLY ACCESSIBLE")}</small>
            <strong className="pink">{t(amount(p.exposure, p.decimals))}</strong>
          </div>
          <div>
            <small>{t("OUTSIDE THIS ALLOWANCE")}</small>
            <strong>
              {t(amount(p.balance !== null && p.exposure !== null ? p.balance - p.exposure : null, p.decimals))}
            </strong>
          </div>
        </div>
        <p>
          {" "}
          {t("Approved allowance:")} {p.unlimited ? t("Effectively unlimited") : p.formattedAllowance} {p.symbol}.
        </p>
        <p className="explanation">{t(p.explanation)}</p>
        <FutureDepositSimulation key={p.key} permission={p} />
        <p className="micro">
          {" "}
          {t(
            "This is not a loss prediction. Authorization scope does not prove withdrawal capability. Future deposits may remain within the allowance scope; unrelated permissions are outside this illustration.",
          )}{" "}
        </p>
        <button className="primary danger" disabled={simulation || busy || p.allowance === 0n} onClick={onRevoke}>
          {" "}
          {t("REVOKE ACTUAL PERMISSION ↗")}{" "}
        </button>
        <button className="text-button" onClick={onClose}>
          {" "}
          {t("Return to wallet")}{" "}
        </button>
      </section>
    </div>
  );
}
