import { useLocale } from "./LocaleProvider";
import { ParasiteCreature } from "./ParasiteCreature";
import { EXPLORER } from "~~/lib/parasite/constants";
import { amount, short } from "~~/lib/parasite/formatting";
import type { Permission } from "~~/lib/parasite/types";

export function ParasiteInspector({
  permission: p,
  busy,
  simulation,
  onSimulate,
  onRevoke,
}: {
  permission?: Permission;
  busy: boolean;
  simulation: boolean;
  onSimulate: () => void;
  onRevoke: () => void;
}) {
  const { t, dateLocale } = useLocale();
  return (
    <aside className="inspector">
      <div className="panel-eyebrow">
        {" "}
        {t("SPECIMEN INSPECTOR")} <span>↗</span>
      </div>
      {p ? (
        <>
          <div className="specimen-portrait">
            <ParasiteCreature seed={p.key} tone={p.unlimited ? "pink" : "amber"} />
            <span>
              {t("SPECIMEN /")} {p.spender.slice(-4).toUpperCase()}
            </span>
          </div>
          <div className={`severity ${p.unlimited ? "pink" : "amber"}`}>{t(p.category)}</div>
          <h2>{t(p.name)}</h2>
          <p className="muted">
            {p.allowance === 0n ? (
              t("No active authorization detected for this pair.")
            ) : (
              <>
                {p.unlimited ? t("Unlimited") : t("Limited")} {t("spending authorization")}
              </>
            )}
          </p>
          <dl className="specimen-data">
            <div>
              <dt>{t("Token")}</dt>
              <dd>{p.symbol}</dd>
            </div>
            <div>
              <dt>{t("Allowance")}</dt>
              <dd title={p.formattedAllowance}>{p.unlimited ? t("Effectively unlimited") : p.formattedAllowance}</dd>
            </div>
            <div>
              <dt>{t("Balance")}</dt>
              <dd>{t(amount(p.balance, p.decimals))}</dd>
            </div>
            <div>
              <dt>{t("Current exposure")}</dt>
              <dd>
                {t(amount(p.exposure, p.decimals))} {p.symbol}
              </dd>
            </div>
            <div>
              <dt>{t("Spender type")}</dt>
              <dd>{t(p.spenderType)}</dd>
            </div>
            <div>
              <dt>{t("Owner")}</dt>
              <dd>{short(p.owner)}</dd>
            </div>
          </dl>
          <div className="address-links">
            <a target="_blank" rel="noreferrer" href={`${EXPLORER}/address/${p.token}`}>
              {" "}
              {t("Token")} {short(p.token)} ↗
            </a>
            <a target="_blank" rel="noreferrer" href={`${EXPLORER}/address/${p.spender}`}>
              {" "}
              {t("Spender")} {short(p.spender)} ↗
            </a>
          </div>
          <p className="explanation">{t(p.explanation)}</p>
          <p className="micro">
            {" "}
            {t(
              "This authorization lets the spender use transferFrom within the token contract's allowance rules. Access is not evidence of a completed withdrawal.",
            )}{" "}
          </p>
          {(p.origin === "demo" || simulation) && (
            <p className="micro">{t("Demo spenders have no withdrawal function.")}</p>
          )}
          {p.metadataUnavailable && (
            <p className="warning">{t("Token metadata unavailable. Raw units are preserved.")}</p>
          )}
          <button className="secondary wide" onClick={onSimulate}>
            {" "}
            {t("◎ SIMULATE EXPOSURE")}{" "}
          </button>
          <button
            className="primary danger wide"
            disabled={busy || simulation || p.allowance === 0n}
            onClick={onRevoke}
          >
            {" "}
            {t("⌁ REVOKE ACCESS")} <span>↗</span>
          </button>
          <p className="micro">
            {" "}
            {t(
              "Removing this approval may interrupt legitimate dApp usage. It does not recover stolen tokens, remove unrelated approvals, or revoke all offchain signatures.",
            )}{" "}
          </p>
          <p className="micro">
            {simulation
              ? t("SIMULATION — illustrative values")
              : t(
                  `Verified at block ${p.block.toString()} · ${new Date(p.verifiedAt).toLocaleTimeString(dateLocale)}`,
                )}{" "}
            · {simulation ? t("Illustrative example") : t(p.source)}
          </p>
        </>
      ) : (
        <div className="inspector-empty">
          <div className="empty-cross">＋</div>
          <h2>{t("Know what's attached.")}</h2>
          <p>{t("Select a verified permission to inspect its scope and control its access.")}</p>
          <p className="micro">{t("No findings are shown until a supported allowance is successfully read.")}</p>
        </div>
      )}
    </aside>
  );
}
