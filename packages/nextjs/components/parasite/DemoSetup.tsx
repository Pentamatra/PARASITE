import { useLocale } from "./LocaleProvider";
import { EXPLORER } from "~~/lib/parasite/constants";
import { amount, short } from "~~/lib/parasite/formatting";
import type { Pair, Scan } from "~~/lib/parasite/types";

export function DemoSetup({
  owner,
  chainId,
  gas,
  pairs,
  scan,
  busy,
  error,
  onCheck,
  onApprove,
  onEnter,
}: {
  owner?: string;
  chainId?: number;
  gas: bigint | null;
  pairs: Pair[];
  scan: Scan | null;
  busy: boolean;
  error?: string;
  onCheck: () => void;
  onApprove: (pair: Pair, unlimited: boolean) => void;
  onEnter: () => void;
}) {
  const { t } = useLocale();
  const active = scan?.permissions.filter(p => p.allowance > 0n).length ?? 0;
  return (
    <section className="demo-setup">
      <div className="eyebrow amber">{t("DEMO SETUP / REAL TESTNET TRANSACTIONS")}</div>
      <h1>{t("TRY PERMISSIONS WITH TEST TOKENS")}</h1>
      <p>{t("One wallet. Test tokens. Real authorizations.")}</p>
      <div className="setup-grid">
        <div>
          <h3>{t("Readiness checklist")}</h3>
          <ul className="checklist">
            <li data-ready={!!owner}>{owner ? short(owner) : t("Connect your demo wallet")}</li>
            <li data-ready={chainId === 10143}>Monad Testnet · {chainId ?? "disconnected"}</li>
            <li data-ready={gas !== null && gas > 0n}>
              {t("Gas:")} {t(amount(gas, 18))} MON
            </li>
            <li data-ready={pairs.length > 0}>{t("Confirmed demo addresses configured")}</li>
            <li data-ready={!!scan?.permissions[0]?.balance}>
              PDEM: {t(amount(scan?.permissions[0]?.balance ?? null, scan?.permissions[0]?.decimals ?? null))}
            </li>
            <li data-ready={active > 0}>
              {active} {t("verified active approvals")}
            </li>
          </ul>
          <button className="secondary" onClick={onCheck} disabled={busy}>
            {" "}
            {t("CHECK DEMO / REFRESH SCAN ↻")}{" "}
          </button>
        </div>
        <div>
          <h3>{t("Grant test-token access")}</h3>
          <p className="micro">
            {" "}
            {t(
              "Each button asks your wallet to approve the named demo spender. It grants real PDEM allowance. No approval is created automatically. Demo spenders cannot withdraw tokens.",
            )}{" "}
          </p>
          {error && <p className="warning">{t(error)}</p>}
          {pairs.map((pair, i) => {
            const permission = scan?.permissions.find(
              p =>
                p.token.toLowerCase() === pair.token.toLowerCase() &&
                p.spender.toLowerCase() === pair.spender.toLowerCase(),
            );
            const ready =
              !!permission &&
              (i === 0
                ? permission.unlimited
                : permission.decimals !== null && permission.allowance === 250n * 10n ** BigInt(permission.decimals));
            return (
              <div className="setup-pair" key={pair.spender}>
                <strong>{t(pair.name)}</strong>
                <a href={`${EXPLORER}/address/${pair.token}`} target="_blank" rel="noreferrer">
                  DemoToken {short(pair.token)} ↗
                </a>
                <a href={`${EXPLORER}/address/${pair.spender}`} target="_blank" rel="noreferrer">
                  DemoSpender {short(pair.spender)} ↗
                </a>
                <p className="micro">
                  {" "}
                  {t("Allowance:")}{" "}
                  {permission?.unlimited ? t("UNLIMITED") : (permission?.formattedAllowance ?? t("Not verified"))}
                </p>
                <button
                  className="primary"
                  disabled={ready || busy || !owner || chainId !== 10143}
                  onClick={() => onApprove(pair, i === 0)}
                >
                  {" "}
                  {ready ? (
                    t("PERMISSION READY ✓")
                  ) : (
                    <>
                      {t("CREATE")} {i === 0 ? t("UNLIMITED") : "250 PDEM"} {t("DEMO APPROVAL ↗")}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <button className="primary wide enter-wallet" onClick={onEnter}>
        {" "}
        {t("ENTER THE INFECTED WALLET →")}{" "}
      </button>
    </section>
  );
}
