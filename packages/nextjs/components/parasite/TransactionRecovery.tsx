"use client";

import { useState } from "react";
import { useLocale } from "./LocaleProvider";
import type { useApprovalTransactions } from "./useApprovalTransactions";
import { EXPLORER } from "~~/lib/parasite/constants";
import { short } from "~~/lib/parasite/formatting";

export function TransactionRecovery({
  transactions,
  correctChain,
}: {
  transactions: ReturnType<typeof useApprovalTransactions>;
  correctChain: boolean;
}) {
  const { t, dateLocale } = useLocale();
  const [acknowledged, setAcknowledged] = useState(false);
  const { pending, working, invalidRecord, storageWarning, proof } = transactions;
  if (!pending && !invalidRecord && !storageWarning && !proof && !working) return null;
  return (
    <section id="approval-evidence" className="approval-evidence" aria-label={t("TRANSACTION VERIFICATION")}>
      <div className="eyebrow">{t("TRANSACTION VERIFICATION")}</div>
      {transactions.stages.length > 0 && (
        <details className="transaction-timeline">
          <summary>{t("Transaction timeline")}</summary>
          <p className="micro">
            {t(
              "LOCAL OBSERVATION TIMELINE — includes wallet and RPC delays; not a network speed benchmark. Reload recovery starts a new observation.",
            )}
          </p>
          <ol>
            {transactions.stages.map((stage, i) => (
              <li key={i}>
                <span>{t(stage.state.replaceAll("_", " "))}</span>
                <time>+{(stage.elapsedMs / 1000).toFixed(2)} s</time>
              </li>
            ))}
          </ol>
        </details>
      )}
      {working && !pending && (
        <p role="status">{t("An approval flow is still running. Wait for it to finish before starting another.")}</p>
      )}
      {pending && (
        <>
          <h2>{t("A submitted transaction needs verification.")}</h2>
          <p>
            {t("Recovery only reads the blockchain. It never requests a new signature or resubmits your transaction.")}
          </p>
          <p>
            {short(pending.owner)} · {t("Submitted")} {new Date(pending.submittedAt).toLocaleString(dateLocale)}
          </p>
          <div className="button-row">
            <button className="secondary" disabled={working || !correctChain} onClick={transactions.retry}>
              {working ? t("VERIFYING…") : t("RECHECK TRANSACTION")}
            </button>
            <a href={`${EXPLORER}/tx/${pending.hash}`} target="_blank" rel="noreferrer">
              {t("VIEW TRANSACTION ↗")}
            </a>
          </div>
          {!correctChain && <p>{t("Switch to Monad Testnet to continue.")}</p>}
        </>
      )}
      {invalidRecord && (
        <div className="invalid-tracking">
          <h2>{t("Saved tracking could not be trusted.")}</h2>
          <p>
            {t(
              "No success has been recorded. Check your wallet activity and explorer before clearing this local record. Clearing tracking does not cancel a transaction, revoke access, or recover funds.",
            )}
          </p>
          <label>
            <input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />
            {t("I checked the transaction separately and understand that only local tracking will be removed.")}
          </label>
          <button
            className="secondary"
            disabled={!acknowledged || working}
            onClick={() => {
              transactions.discardInvalidRecord();
              setAcknowledged(false);
            }}
          >
            {t("CLEAR INVALID LOCAL TRACKING")}
          </button>
        </div>
      )}
      {storageWarning && (
        <p className="warning" role="status">
          {t(storageWarning)}
        </p>
      )}
      {proof && (
        <>
          <h2>{t("Verified onchain. Independently checked.")}</h2>
          <p>
            {t(
              "Two confirmations and a fresh allowance read. These are recorded observations, not a full wallet audit.",
            )}
          </p>
          <details>
            <summary>{t("Technical details")}</summary>
            <dl className="approval-proof">
              <div>
                <dt>{t("RPC finalized head covering receipt")}</dt>
                <dd>{proof.finalizedBlock?.toString() ?? t("Not observed; no finality claim")}</dd>
              </div>
              <div>
                <dt>{t("Token contract")}</dt>
                <dd>
                  <a href={`${EXPLORER}/address/${proof.token}`} target="_blank" rel="noreferrer">
                    {proof.token}
                  </a>
                </dd>
              </div>
              <div>
                <dt>{t("Spender")}</dt>
                <dd>
                  <a href={`${EXPLORER}/address/${proof.spender}`} target="_blank" rel="noreferrer">
                    {proof.spender}
                  </a>
                </dd>
              </div>
              <div>
                <dt>{t("Allowance / raw units")}</dt>
                <dd>{proof.allowance.toString()}</dd>
              </div>
              <div>
                <dt>{t("Receipt block")}</dt>
                <dd>{proof.receiptBlock.toString()}</dd>
              </div>
              <div>
                <dt>{t("Verification block")}</dt>
                <dd>{proof.verificationBlock.toString()}</dd>
              </div>
              <div>
                <dt>{t("Verified at")}</dt>
                <dd>{new Date(proof.verifiedAt).toLocaleString(dateLocale)}</dd>
              </div>
            </dl>
          </details>
          <a href={`${EXPLORER}/tx/${proof.hash}`} target="_blank" rel="noreferrer">
            {t("VIEW TRANSACTION ↗")}
          </a>
        </>
      )}
    </section>
  );
}
