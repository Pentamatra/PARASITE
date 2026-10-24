"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "./LocaleProvider";
import { ReviewDialog } from "./ReviewDialog";
import {
  type Abi,
  type Address,
  BaseError,
  type Hash,
  type Hex,
  type PublicClient,
  type WalletClient,
  isAddress,
} from "viem";
import { EXPLORER } from "~~/lib/parasite/constants";
import { matchesDemoDeployment, matchesDeploymentReceipt } from "~~/lib/parasite/deploymentRecovery";
import type { Pair } from "~~/lib/parasite/types";

type Record = { version: 1; owner: Address; hash: Hash; address?: Address };
export const comparisonKey = (owner: string) => `parasite:comparison:v1:10143:${owner.toLowerCase()}`;
export function ComparisonDemo({
  owner,
  chainId,
  token,
  client,
  wallet,
  disabled,
  onReady,
  onBusyChange,
}: {
  owner: Address;
  chainId?: number;
  token: Address;
  client: PublicClient;
  wallet?: WalletClient;
  disabled: boolean;
  onReady: (pair: Pair) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { t } = useLocale();
  const [review, setReview] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [hash, setHash] = useState<Hash>();
  const [recoveryHash, setRecoveryHash] = useState("");
  const [stage, setStage] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const attemptKey = `${comparisonKey(owner)}:wallet-request`;
  const lock = useRef(false);
  const memory = useRef<Record>();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    try {
      setUncertain(!!localStorage.getItem(attemptKey));
    } catch {
      setUncertain(true);
    }
    return () => {
      alive.current = false;
    };
  }, [attemptKey]);
  async function run(recover = false) {
    if (lock.current || disabled || chainId !== 10143 || !wallet) return;
    setReview(false);
    lock.current = true;
    setWorking(true);
    onBusyChange(true);
    setError("");
    setStage("Checking wallet and Monad Testnet…");
    try {
      if (
        (await client.getChainId()) !== 10143 ||
        (await wallet.getChainId()) !== 10143 ||
        (await wallet.getAddresses())[0]?.toLowerCase() !== owner.toLowerCase()
      )
        throw new Error("Wallet account changed. Scan again.");
      const artifacts = await import("~~/lib/parasite/demoArtifacts.json");
      let record = memory.current;
      const raw = localStorage.getItem(comparisonKey(owner));
      if (raw) {
        const saved = JSON.parse(raw);
        if (
          saved.version !== 1 ||
          saved.owner?.toLowerCase() !== owner.toLowerCase() ||
          !/^0x[0-9a-fA-F]{64}$/.test(saved.hash) ||
          (saved.address && !isAddress(saved.address))
        )
          throw new Error("Saved deployment tracking is invalid. Review wallet activity before retrying.");
        record = saved;
      }
      if (recover) {
        const candidate = recoveryHash.trim();
        if (!/^0x[0-9a-fA-F]{64}$/.test(candidate)) throw new Error("Enter a valid transaction hash.");
        if (record && record.hash.toLowerCase() !== candidate.toLowerCase())
          throw new Error("A different deployment is already tracked. Verify the existing transaction first.");
        record = { version: 1, owner, hash: candidate as Hash };
      }
      const persist = (next: Record) => {
        memory.current = next;
        if (alive.current) setHash(next.hash);
        try {
          localStorage.setItem(comparisonKey(owner), JSON.stringify(next));
        } catch {
          if (alive.current) setError("Keep this page open. The public deployment recovery record could not be saved.");
        }
      };
      if (!record) {
        if (uncertain || localStorage.getItem(attemptKey))
          throw new Error(
            "A wallet request may already have been broadcast. Recover its transaction hash before creating another contract.",
          );
        // Save before asking the provider: an RPC error can occur AFTER broadcast.
        localStorage.setItem(attemptKey, "pending");
        setUncertain(true);
        setStage("Waiting for your wallet to return a transaction hash…");
        const tx = await wallet.deployContract({
          account: owner,
          chain: wallet.chain,
          abi: artifacts.DemoSpender.abi as Abi,
          bytecode: artifacts.DemoSpender.bytecode as Hex,
          args: [],
        });
        record = { version: 1, owner, hash: tx };
        persist(record);
      }
      if (alive.current) setHash(record.hash);
      setStage("Checking the submitted contract creation…");
      const matches = (tx: { from: Address; to: Address | null; input: Hex; value: bigint }) =>
        matchesDemoDeployment(tx, owner, artifacts.DemoSpender.bytecode as Hex);
      const tx = await client.getTransaction({ hash: record.hash });
      let deploymentNonce = tx.nonce;
      if (!matches(tx)) throw new Error("Deployment transaction does not match the expected demo contract.");
      persist(record);
      setStage("Transaction found. Waiting for two confirmations…");
      let changed = false;
      const receipt = await client.waitForTransactionReceipt({
        hash: record.hash,
        confirmations: 2,
        pollingInterval: 1_000,
        timeout: 180_000,
        onReplaced: event => {
          if (event.reason !== "repriced" || !matches(event.transaction)) {
            changed = true;
            return;
          }
          deploymentNonce = event.transaction.nonce;
          record = { version: 1, owner, hash: event.transaction.hash };
          persist(record);
        },
      });
      if (
        changed ||
        !receipt.contractAddress ||
        !matchesDeploymentReceipt(receipt, record.hash, owner, deploymentNonce)
      )
        throw new Error("Deployment is not verified. Check the explorer before retrying.");
      const code = await client.getBytecode({ address: receipt.contractAddress });
      if (!code || code === "0x") throw new Error("Deployment bytecode is unavailable. Recheck the transaction.");
      persist({ ...record, address: receipt.contractAddress });
      localStorage.removeItem(attemptKey);
      setUncertain(false);
      if (alive.current) onReady({ token, spender: receipt.contractAddress, name: "Ember 01", origin: "demo" });
    } catch (caught) {
      if (alive.current) {
        const message =
          caught instanceof BaseError
            ? [caught.shortMessage, caught.details].filter(Boolean).join(" ")
            : caught instanceof Error
              ? caught.message
              : "Deployment failed";
        setError(message);
      }
    } finally {
      lock.current = false;
      if (alive.current) setWorking(false);
      onBusyChange(false);
    }
  }
  return (
    <div className="comparison-setup">
      <h3>{t("COMPARE TWO REAL PERMISSIONS")}</h3>
      <p>
        {t(
          "Add a second demo spender for a separate 250 PDEM allowance. Revoking one permission will leave the other unchanged. One wallet is enough.",
        )}
      </p>
      <button
        className="secondary"
        disabled={working || disabled || uncertain || chainId !== 10143 || !wallet}
        onClick={() => setReview(true)}
      >
        {t(working ? "VERIFYING…" : "PREPARE / RECOVER SECOND SPENDER")}
      </button>
      {working && <p role="status">{t(stage)}</p>}
      {uncertain && !working && (
        <p className="warning">
          {t(
            "A wallet request may already have been broadcast. Recover its transaction hash before creating another contract.",
          )}
        </p>
      )}
      <details className="deployment-recovery">
        <summary>{t("Recover an existing deployment")}</summary>
        <p>
          {t(
            "Use this only if a contract creation was already submitted. Enter its transaction hash to verify it without a new signature.",
          )}
        </p>
        <label>
          {t("Existing deployment transaction hash")}
          <input
            aria-label={t("Existing deployment transaction hash")}
            value={recoveryHash}
            onChange={event => setRecoveryHash(event.target.value)}
            placeholder="0x…"
            disabled={working}
          />
        </label>
        <button
          className="secondary"
          disabled={working || disabled || !recoveryHash.trim() || chainId !== 10143 || !wallet}
          onClick={() => void run(true)}
        >
          {t("VERIFY EXISTING TRANSACTION — NO SIGNATURE")}
        </button>
      </details>
      {error && (
        <p className="warning" role="status">
          {t(error)}
        </p>
      )}
      {hash && (
        <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer">
          {t("VIEW TRANSACTION ↗")}
        </a>
      )}
      {review && (
        <ReviewDialog title={t("Prepare a comparison spender")} onClose={() => setReview(false)}>
          <p>
            {t(
              "This creates one DemoSpender contract on Monad Testnet using test MON for gas. It cannot withdraw tokens. No allowance is granted and no tokens are transferred. If a saved transaction exists, only verification is resumed.",
            )}
          </p>
          <div className="button-row">
            <button className="secondary" onClick={() => setReview(false)}>
              {t("CANCEL")}
            </button>
            <button className="primary" onClick={() => void run()}>
              {t("UNDERSTOOD — CONTINUE")}
            </button>
          </div>
        </ReviewDialog>
      )}
    </div>
  );
}
