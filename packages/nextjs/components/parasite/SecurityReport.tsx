import { useLocale } from "./LocaleProvider";
import { COVERAGE, EXPLORER } from "~~/lib/parasite/constants";
import { short } from "~~/lib/parasite/formatting";
import { reportCardSvg } from "~~/lib/parasite/reportCard";
import type { Revocation, Scan } from "~~/lib/parasite/types";

export function SecurityReport({
  before,
  scan,
  revocations,
  owner,
}: {
  before: number | null;
  scan: Scan | null;
  revocations: Revocation[];
  owner?: string;
}) {
  const { t, dateLocale, locale } = useLocale();
  const active = scan?.permissions.filter(p => p.allowance > 0n).length;
  const download = () => {
    const report = {
      product: "PARASITE",
      language: locale,
      chain: t("Monad Testnet"),
      wallet: owner ? short(owner) : t("Disconnected"),
      before,
      verifiedActiveAfter: active ?? null,
      supportedPairsChecked: scan?.checked ?? 0,
      successfulReads: scan?.permissions.length ?? 0,
      failedReads: scan?.failures.length ?? 0,
      block: scan?.block.toString(),
      time: scan?.time,
      revocations: revocations.map(r => ({
        transaction: `${EXPLORER}/tx/${r.hash}`,
        time: r.time,
        receiptBlock: r.receiptBlock?.toString(),
        verificationBlock: r.verificationBlock?.toString(),
      })),
      coverage: t(COVERAGE),
      limitations: t(
        "Known configured pairs only. Not a full wallet audit. No USD valuation or maliciousness assessment.",
      ),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "parasite-security-report.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="report">
      <div className="eyebrow">{t("SESSION SECURITY REPORT / MONAD TESTNET")}</div>
      <h1>
        {revocations.length ? (
          <>
            {" "}
            {t("ONE LESS PERMISSION.")} <br />
            <span>{t("ONE SAFER WALLET.")}</span>
          </>
        ) : (
          <>
            {" "}
            {t("YOUR PERMISSIONS.")} <br />
            <span>{t("IN PLAIN SIGHT.")}</span>
          </>
        )}
      </h1>
      <p>
        {owner ? short(owner) : t("Connect a wallet for a verified report")} ·{" "}
        {scan ? new Date(scan.time).toLocaleString(dateLocale) : t("No scan yet")}
      </p>
      <div className="report-stats">
        <div>
          <strong>{scan?.checked ?? "—"}</strong>
          <small>{t("SUPPORTED PAIRS CHECKED")}</small>
        </div>
        <div>
          <strong>
            {before ?? "—"} → {active ?? "—"}
          </strong>
          <small>{t("VERIFIED ACTIVE / BEFORE → AFTER")}</small>
        </div>
        <div>
          <strong>{revocations.length}</strong>
          <small>{t("VERIFIED REVOKES THIS SESSION")}</small>
        </div>
      </div>
      <p>
        {scan?.permissions.length ?? 0} {t("successful reads ·")} {scan?.failures.length ?? 0}{" "}
        {t("unresolved pairs · Block")} {scan?.block.toString() ?? t("unavailable")}
      </p>
      {revocations.map(r => (
        <p key={r.hash}>
          <a href={`${EXPLORER}/tx/${r.hash}`} target="_blank" rel="noreferrer">
            {" "}
            {t("Confirmed revocation")} {short(r.hash)} ↗
          </a>
        </p>
      ))}
      <p>{t(COVERAGE)}</p>
      {before === null && revocations.length > 0 && (
        <p className="micro">
          {t("The pre-transaction baseline is unavailable after recovery. No before count has been invented.")}
        </p>
      )}
      <p className="micro">
        {" "}
        {t(
          "PARASITE checks supported approval relationships. It is not a full wallet security audit. One revoked approval does not eliminate other wallet risks. Counts reflect successful reads only; failed reads are unresolved.",
        )}{" "}
      </p>
      <div className="button-row">
        <button
          className="secondary"
          disabled={!scan}
          onClick={() => {
            if (!scan) return;
            const svg = reportCardSvg({
              headline: t(revocations.length ? "ONE LESS PERMISSION." : "YOUR PERMISSIONS."),
              wallet: owner ? short(owner) : t("Disconnected"),
              checked: scan.checked,
              before,
              after: active ?? null,
              revoked: revocations.length,
              time: new Date(scan.time).toLocaleString(dateLocale),
              labels: [t("PAIRS CHECKED"), t("ACTIVE / BEFORE → AFTER"), t("VERIFIED REVOKES")],
              limitation: t("Supported pairs only. Not a full wallet audit. No loss prediction."),
            });
            const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = "parasite-report-card.svg";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          {t("DOWNLOAD VISUAL CARD ↓")}
        </button>
        <button className="primary" disabled={!scan} onClick={download}>
          {" "}
          {t("DOWNLOAD REPORT ↓")}{" "}
        </button>
        <button className="secondary" onClick={() => window.print()}>
          {" "}
          {t("PRINT REPORT ↗")}{" "}
        </button>
      </div>
    </section>
  );
}
