"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "./LocaleProvider";
import { ReviewDialog } from "./ReviewDialog";
import { type Address, type PublicClient, isAddress, zeroAddress } from "viem";
import { type LogCoverage, approvalLogPairs } from "~~/lib/parasite/discovery/approvalLogs";
import { pairKey, validPair } from "~~/lib/parasite/pairs";
import { discover } from "~~/lib/parasite/permissions";
import type { Pair, Scan } from "~~/lib/parasite/types";

export function AddPermission({
  owner,
  client,
  onClose,
  onAdd,
  capacity,
  existingKeys,
}: {
  owner: Address;
  client: PublicClient;
  onClose: () => void;
  onAdd: (pairs: Pair[]) => void;
  capacity: number;
  existingKeys: string[];
}) {
  const { t } = useLocale();
  const [token, setToken] = useState("");
  const [spender, setSpender] = useState("");
  const [history, setHistory] = useState(false);
  const [blocks, setBlocks] = useState("1000");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Scan>();
  const [coverage, setCoverage] = useState<LogCoverage>();
  const mounted = useRef(true);
  const controller = useRef<AbortController>();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  const clear = () => {
    setResult(undefined);
    setCoverage(undefined);
    setError("");
  };
  async function check() {
    if (working) return;
    setWorking(true);
    const abort = new AbortController();
    controller.current = abort;
    clear();
    try {
      if (!isAddress(token) || token.toLowerCase() === zeroAddress || (!history && !validPair(token, spender)))
        throw new Error("Enter valid nonzero contract and spender addresses.");
      let pairs: Pair[];
      let covered: LogCoverage | undefined;
      if (history) {
        if (!/^[1-9][0-9]{0,3}$/.test(blocks) || Number(blocks) > 5000)
          throw new Error("Choose at most 5,000 recent blocks.");
        const head = await client.getBlockNumber({ cacheTime: 0 });
        const to = head > 8n ? head - 8n : 0n;
        const count = BigInt(blocks);
        covered = await approvalLogPairs(
          client,
          owner,
          token,
          to >= count - 1n ? to - count + 1n : 0n,
          to,
          abort.signal,
        );
        pairs = covered.pairs;
      } else
        pairs = [{ token, spender: spender as Address, name: `Permission · ${spender.slice(-6)}`, origin: "manual" }];
      if (abort.signal.aborted) return;
      const scan = await discover(client, owner, pairs);
      if (!mounted.current) return;
      setCoverage(covered);
      setResult(scan);
    } catch (caught) {
      if (mounted.current) setError(caught instanceof Error ? caught.message : "Discovery unavailable");
    } finally {
      if (mounted.current) setWorking(false);
    }
  }
  const eligible = result?.permissions.filter(p => !existingKeys.includes(pairKey(p))).slice(0, capacity) ?? [];
  return (
    <ReviewDialog title={t("VERIFY A PERMISSION")} eyebrow={t("READ-ONLY DISCOVERY")} onClose={onClose}>
      <p className="micro">
        {capacity} {t("new pairs can be added within the 24-pair limit. Existing pairs remain unchanged.")}
      </p>
      <p>
        {t(
          "Read-only discovery. No approval, signature, or token transfer is requested. A supplied label is not a reputation assessment.",
        )}
      </p>
      <label>
        {t("Token contract")}
        <input
          value={token}
          disabled={working}
          spellCheck={false}
          maxLength={42}
          onChange={e => {
            setToken(e.target.value.trim());
            clear();
          }}
          placeholder="0x…"
        />
      </label>
      <label className="review-checkbox">
        <input
          type="checkbox"
          checked={history}
          disabled={working}
          onChange={e => {
            setHistory(e.target.checked);
            clear();
          }}
        />
        {t("Discover recent Approval events for this token")}
      </label>
      {history ? (
        <>
          <label>
            {t("Recent blocks to inspect (maximum 5,000)")}
            <input
              inputMode="numeric"
              value={blocks}
              maxLength={4}
              disabled={working}
              onChange={e => {
                setBlocks(e.target.value);
                clear();
              }}
            />
          </label>
          <p className="micro">
            {t(
              "Only this token and owner are searched. Up to 12 pairs and 80 log requests; the last eight blocks are excluded. Historical event amounts are always replaced by current contract reads.",
            )}
          </p>
        </>
      ) : (
        <label>
          {t("Spender")}
          <input
            value={spender}
            disabled={working}
            spellCheck={false}
            maxLength={42}
            onChange={e => {
              setSpender(e.target.value.trim());
              clear();
            }}
            placeholder="0x…"
          />
        </label>
      )}
      <button className="secondary" disabled={working} onClick={() => void check()}>
        {t(working ? "VERIFYING…" : "VERIFY FROM CHAIN")}
      </button>
      {error && (
        <p className="warning" role="alert">
          {t(error.slice(0, 350))}
        </p>
      )}
      {coverage && (
        <p className="micro">
          {t("Blocks inspected:")} {coverage.from.toString()} → {coverage.scannedTo?.toString() ?? "—"} /{" "}
          {t("Requested end:")} {coverage.requestedTo.toString()} · {coverage.requests} RPC ·{" "}
          {t(coverage.partial ? "PARTIAL COVERAGE" : "REQUESTED RANGE CHECKED")}.{" "}
          {t("Full historical coverage not guaranteed.")}
        </p>
      )}
      {result && (
        <div className="manual-results">
          <p>
            {result.permissions.length} {t("verified pairs")} · {result.failures.length} {t("unresolved pairs")}
          </p>
          {result.permissions.map(p => (
            <p key={p.key}>
              {p.symbol} · {p.spender} · {t(p.category)}
            </p>
          ))}
          {result.failures.map(f => (
            <p className="warning" key={f.pair.spender}>
              {t(f.status)}: {t(f.message.slice(0, 200))}
            </p>
          ))}
          {!result.checked && (
            <p>{t("No pairs were found in this bounded range. This does not mean the wallet has no approvals.")}</p>
          )}
          <button
            className="primary"
            disabled={!eligible.length}
            onClick={() =>
              onAdd(eligible.map(p => ({ token: p.token, spender: p.spender, name: p.name, origin: p.origin })))
            }
          >
            {t("ADD VERIFIED PAIRS")}
            {` (${eligible.length})`}
          </button>
        </div>
      )}
    </ReviewDialog>
  );
}
