"use client";

import { useLocale } from "./LocaleProvider";
import { ReviewDialog } from "./ReviewDialog";
import { type Address } from "viem";
import { EXPLORER } from "~~/lib/parasite/constants";
import { isUnlimited } from "~~/lib/parasite/exposure";
import { amount, short } from "~~/lib/parasite/formatting";
import type { Pair, Permission } from "~~/lib/parasite/types";

export type ApprovalIntent = {
  owner: Address;
  pair: Pair;
  value: bigint;
  permission?: Permission;
  decimals: number | null;
};
export function ApprovalReview({
  intent,
  onClose,
  onConfirm,
}: {
  intent: ApprovalIntent;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLocale();
  const revoke = intent.value === 0n;
  return (
    <ReviewDialog
      title={t(revoke ? "Remove this token permission" : "Create a test-token permission")}
      onClose={onClose}
    >
      <p className="review-summary">
        {t(
          revoke
            ? "You are removing one spender's access to one token. Your token balance is not transferred."
            : "You are granting real test-token allowance. Creating an allowance is different from deploying a demo contract.",
        )}
      </p>
      <dl className="review-facts">
        <div>
          <dt>{t("Network")}</dt>
          <dd>Monad Testnet · 10143</dd>
        </div>
        <div>
          <dt>{t("Owner")}</dt>
          <dd>{short(intent.owner)}</dd>
        </div>
        <div>
          <dt>{t("Token")}</dt>
          <dd>
            {intent.permission?.symbol || t("Demo token")}{" "}
            <a href={`${EXPLORER}/address/${intent.pair.token}`} target="_blank" rel="noreferrer">
              {intent.pair.token} ↗
            </a>
          </dd>
        </div>
        <div>
          <dt>{t("Spender")}</dt>
          <dd>
            <a href={`${EXPLORER}/address/${intent.pair.spender}`} target="_blank" rel="noreferrer">
              {intent.pair.spender} ↗
            </a>
          </dd>
        </div>
        <div>
          <dt>{t("Current allowance snapshot")}</dt>
          <dd>
            {intent.permission
              ? intent.permission.unlimited
                ? t("Effectively unlimited")
                : t(intent.permission.formattedAllowance)
              : t("Not verified")}
          </dd>
        </div>
        <div>
          <dt>{t("Requested allowance")}</dt>
          <dd>{isUnlimited(intent.value) ? t("Effectively unlimited") : t(amount(intent.value, intent.decimals))}</dd>
        </div>
        <div>
          <dt>{t("Are tokens sent?")}</dt>
          <dd>{t("No. Only the token allowance changes.")}</dd>
        </div>
        <div>
          <dt>{t("Network fee")}</dt>
          <dd>{t("Paid in test MON. Review the fee estimate in your wallet.")}</dd>
        </div>
      </dl>
      <div className="review-verification">
        <strong>{t("What happens next?")}</strong>
        <p>
          {t(
            "We recheck your wallet and network, read the current allowance, simulate approve, then ask your wallet to sign. After confirmation we independently read the allowance again. An unresolved check never becomes success.",
          )}
        </p>
      </div>
      <p className="micro">
        {t(
          revoke
            ? "Other approvals and offchain signatures remain unchanged. Revocation may interrupt legitimate dApp use and cannot recover stolen tokens."
            : "This grants access up to the requested allowance under the token rules. Allowance size does not prove a spender can withdraw tokens. Unlimited authorization may cover future deposits.",
        )}
      </p>
      <details>
        <summary>{t("Transaction details")}</summary>
        <code>
          approve({intent.pair.spender}, {intent.value.toString()})
        </code>
      </details>
      <div className="button-row">
        <button className="secondary" onClick={onClose}>
          {t("CANCEL")}
        </button>
        <button className={`primary ${revoke ? "danger" : ""}`} onClick={onConfirm}>
          {t("UNDERSTOOD — OPEN WALLET")}
        </button>
      </div>
    </ReviewDialog>
  );
}
