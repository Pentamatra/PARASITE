"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Address, type Hash, type PublicClient, type WalletClient } from "viem";
import {
  type PendingApproval,
  type PendingStorage,
  clearPendingApproval,
  pendingApprovalKey,
  readPendingApproval,
  savePendingApproval,
} from "~~/lib/parasite/pendingApproval";
import { ApprovalVerificationError, approveAndVerify, verifyApprovalTransaction } from "~~/lib/parasite/transactions";
import type { Pair, TxObservation, TxState, VerifiedApproval } from "~~/lib/parasite/types";

function browserStorage(): PendingStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Owns only approval transactions. Recovery has no wallet write path. */
export function useApprovalTransactions({
  owner,
  chainId,
  client,
  wallet,
  onVerified,
  onRecoveryFound,
}: {
  owner?: Address;
  chainId?: number;
  client?: PublicClient;
  wallet?: WalletClient;
  onVerified: (proof: VerifiedApproval, recovered: boolean) => void | Promise<void>;
  onRecoveryFound: () => void;
}) {
  const [txState, setTxState] = useState<TxState>("IDLE");
  const [txHash, setTxHash] = useState<Hash>();
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [pending, setPending] = useState<PendingApproval>();
  const [invalidRecord, setInvalidRecord] = useState(false);
  const [working, setWorking] = useState(false);
  const [loadedOwner, setLoadedOwner] = useState("");
  const [proof, setProof] = useState<VerifiedApproval>();
  const [stages, setStages] = useState<TxObservation[]>([]);
  const startedAt = useRef(0);
  const pendingRef = useRef<PendingApproval>();
  const lock = useRef(false);
  const mounted = useRef(false);
  const automaticAttempt = useRef("");
  const invalidSnapshot = useRef<string | null>(null);
  const identity = `${owner?.toLowerCase()}:${chainId}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const callbacks = useRef({ onVerified, onRecoveryFound });
  callbacks.current = { onVerified, onRecoveryFound };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    automaticAttempt.current = "";
    setTxState("IDLE");
    setError("");
    setTxHash(undefined);
    setProof(undefined);
    setStages([]);
    setStorageWarning("");
    setInvalidRecord(false);
    invalidSnapshot.current = null;
    pendingRef.current = undefined;
    setPending(undefined);
    setLoadedOwner("");
    if (!owner) return;
    const load = () => {
      const result = readPendingApproval(browserStorage(), owner);
      if (result.kind === "valid") {
        setProof(undefined);
        setInvalidRecord(false);
        pendingRef.current = result.record;
        setPending(result.record);
        setTxHash(result.record.hash);
        setTxState("UNRESOLVED");
        callbacks.current.onRecoveryFound();
      } else if (result.kind === "invalid") {
        pendingRef.current = undefined;
        setPending(undefined);
        try {
          invalidSnapshot.current = browserStorage()?.getItem(pendingApprovalKey(owner)) ?? null;
        } catch {
          /* Storage stays blocked. */
        }
        setInvalidRecord(true);
        setTxState("UNRESOLVED");
        callbacks.current.onRecoveryFound();
      } else if (result.kind === "unavailable") {
        setStorageWarning(
          "Browser storage is unavailable. Keep this page open until verification finishes; reload recovery cannot be guaranteed.",
        );
      } else {
        pendingRef.current = undefined;
        setPending(undefined);
        setInvalidRecord(false);
        setTxState("IDLE");
        setTxHash(undefined);
      }
      setLoadedOwner(owner.toLowerCase());
    };
    load();
    const changed = (event: StorageEvent) => {
      if ((event.key === pendingApprovalKey(owner) || event.key === null) && !lock.current) load();
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [owner, chainId]);

  const isCurrent = useCallback((captured: string) => mounted.current && identityRef.current === captured, []);
  const transition = useCallback(
    (state: TxState, captured: string) => {
      if (!isCurrent(captured)) return;
      setTxState(state);
      const elapsedMs = Math.max(0, Math.round(performance.now() - startedAt.current));
      setStages(items => (items.at(-1)?.state === state ? items : [...items, { state, elapsedMs }]));
    },
    [isCurrent],
  );

  const track = useCallback(
    (record: PendingApproval, captured: string, previousHash?: Hash) => {
      // Save for the submitting owner even if the visible account changed meanwhile.
      const saved = savePendingApproval(browserStorage(), record, previousHash);
      if (isCurrent(captured)) {
        automaticAttempt.current = `${captured}:${record.hash}`;
        pendingRef.current = record;
        setPending(record);
        setTxHash(record.hash);
        if (!saved)
          setStorageWarning(
            "The transaction was submitted, but its recovery record could not be saved. Keep this page open and retain the explorer link.",
          );
      }
    },
    [isCurrent],
  );

  const finish = useCallback(
    async (verified: VerifiedApproval, record: PendingApproval, captured: string, recovered: boolean) => {
      const cleared = clearPendingApproval(browserStorage(), record.owner, record.hash);
      if (!isCurrent(captured)) return;
      pendingRef.current = undefined;
      setPending(undefined);
      setInvalidRecord(false);
      setProof(verified);
      setTxHash(verified.hash);
      setTxState("SUCCESS");
      setError("");
      if (!cleared)
        setStorageWarning(
          "The onchain result is verified, but local tracking could not be cleared. A later recovery check may appear again.",
        );
      try {
        await callbacks.current.onVerified(verified, recovered);
      } catch {
        if (isCurrent(captured))
          setError(
            "The approval is verified, but refreshing the interface failed. Refresh the scan to load the current state.",
          );
      }
    },
    [isCurrent],
  );

  const failed = useCallback(
    (caught: unknown, record: PendingApproval | undefined, captured: string) => {
      const terminal =
        caught instanceof ApprovalVerificationError && (caught.kind === "REVERTED" || caught.kind === "REPLACED");
      if (terminal && record) clearPendingApproval(browserStorage(), record.owner, record.hash);
      if (!isCurrent(captured)) return;
      if (terminal) {
        pendingRef.current = undefined;
        setPending(undefined);
      }
      if (caught instanceof ApprovalVerificationError && caught.kind === "INTENT_MISMATCH") {
        setInvalidRecord(true);
        try {
          invalidSnapshot.current = record
            ? (browserStorage()?.getItem(pendingApprovalKey(record.owner)) ?? null)
            : null;
        } catch {
          /* Keep the invalid record blocked. */
        }
      }
      setTxState(record && !terminal ? "UNRESOLVED" : "FAILED");
      setError(
        caught instanceof Error
          ? caught.message
          : "Transaction verification is unresolved. No success has been recorded.",
      );
    },
    [isCurrent],
  );

  const recover = useCallback(
    async (record: PendingApproval) => {
      if (lock.current || !client || !owner || chainId !== 10143 || record.owner.toLowerCase() !== owner.toLowerCase())
        return;
      lock.current = true;
      startedAt.current = performance.now();
      setStages([]);
      setWorking(true);
      setError("");
      setTxHash(record.hash);
      setTxState("WAITING_FOR_CONFIRMATION");
      const captured = identityRef.current;
      let tracked = record;
      try {
        const verified = await verifyApprovalTransaction({
          client,
          owner: record.owner,
          pair: { token: record.token, spender: record.spender, name: "Recovered permission" },
          value: BigInt(record.requestedAllowance),
          hash: record.hash,
          state: state => {
            transition(state, captured);
          },
          submitted: hash => {
            const previousHash = tracked.hash;
            tracked = { ...tracked, hash };
            track(tracked, captured, previousHash);
          },
        });
        await finish(verified, tracked, captured, true);
      } catch (caught) {
        failed(caught, tracked, captured);
      } finally {
        lock.current = false;
        if (mounted.current) setWorking(false);
      }
    },
    [client, owner, chainId, track, finish, failed, transition],
  );

  // One automatic read-only attempt per owner/chain/hash. Failures require an explicit retry.
  useEffect(() => {
    if (!pending || working || !client || !owner || chainId !== 10143) return;
    const key = `${identity}:${pending.hash}`;
    if (automaticAttempt.current === key) return;
    automaticAttempt.current = key;
    void recover(pending);
  }, [pending, working, client, owner, chainId, identity, recover]);

  const submit = useCallback(
    async (pair: Pair, value: bigint) => {
      if (lock.current || !owner || !client || !wallet) return;
      if (chainId !== 10143) {
        setError("Switch to Monad Testnet to continue.");
        return;
      }
      if (loadedOwner !== owner.toLowerCase()) {
        setError("Local transaction tracking is still loading. Try again shortly.");
        return;
      }
      lock.current = true;
      startedAt.current = performance.now();
      setStages([]);
      setWorking(true);
      setError("");
      const captured = identityRef.current;
      let tracked: PendingApproval | undefined;
      const run = async () => {
        const saved = readPendingApproval(browserStorage(), owner);
        if (
          saved.kind === "valid" ||
          (pendingRef.current && pendingRef.current.owner.toLowerCase() === owner.toLowerCase())
        ) {
          const existing = saved.kind === "valid" ? saved.record : pendingRef.current!;
          if (isCurrent(captured)) {
            pendingRef.current = existing;
            setPending(existing);
            setTxHash(existing.hash);
            setTxState("UNRESOLVED");
          }
          throw new Error(
            "An earlier approval transaction still needs verification. Recheck it before sending another transaction.",
          );
        }
        if (saved.kind === "invalid") {
          if (isCurrent(captured)) setInvalidRecord(true);
          throw new Error("Saved transaction tracking is invalid. Review it before submitting a new approval.");
        }
        if (!isCurrent(captured)) return;
        setTxHash(undefined);
        setProof(undefined);
        setTxState("RECHECKING_ALLOWANCE");
        const verified = await approveAndVerify({
          client,
          wallet,
          owner,
          pair,
          value,
          state: state => {
            transition(state, captured);
          },
          submitted: hash => {
            const previousHash = tracked?.hash;
            tracked = {
              version: 1,
              chainId: 10143,
              owner,
              token: pair.token,
              spender: pair.spender,
              requestedAllowance: value.toString(),
              hash,
              submittedAt: tracked?.submittedAt ?? new Date().toISOString(),
            };
            track(tracked, captured, previousHash);
          },
        });
        if (tracked) await finish(verified, tracked, captured, false);
      };
      try {
        // Modern browsers coordinate submissions across tabs; recovery never needs this write lock.
        if (navigator.locks)
          await navigator.locks.request(`${pendingApprovalKey(owner)}:submit`, { ifAvailable: true }, async lease => {
            if (!lease)
              throw new Error(
                "Another tab is processing an approval for this wallet. Return to that tab or wait for its verification.",
              );
            await run();
          });
        else {
          setStorageWarning(
            "This browser cannot coordinate submissions across tabs. Use a single PARASITE tab while submitting transactions.",
          );
          await run();
        }
      } catch (caught) {
        failed(caught, tracked ?? pendingRef.current, captured);
      } finally {
        lock.current = false;
        if (mounted.current) setWorking(false);
      }
    },
    [owner, chainId, client, wallet, loadedOwner, isCurrent, track, finish, failed, transition],
  );

  const retry = useCallback(() => {
    if (pendingRef.current) void recover(pendingRef.current);
  }, [recover]);
  const discardInvalidRecord = useCallback(() => {
    if (!owner || lock.current || !invalidRecord) return;
    try {
      // Never delete a newer record written by another tab after this warning appeared.
      if (
        invalidSnapshot.current === null ||
        window.localStorage.getItem(pendingApprovalKey(owner)) !== invalidSnapshot.current
      ) {
        setStorageWarning("Saved tracking changed in another tab. Reload this page to review the current record.");
        return;
      }
      window.localStorage.removeItem(pendingApprovalKey(owner));
      invalidSnapshot.current = null;
      pendingRef.current = undefined;
      setPending(undefined);
      setInvalidRecord(false);
      setError("");
      setTxState("IDLE");
      setTxHash(undefined);
    } catch {
      setStorageWarning("Local tracking could not be removed. Browser storage is unavailable.");
    }
  }, [owner, invalidRecord]);

  return {
    txState,
    txHash,
    error,
    storageWarning,
    pending,
    invalidRecord,
    working,
    proof,
    stages,
    ready: !owner || loadedOwner === owner.toLowerCase(),
    submit,
    retry,
    discardInvalidRecord,
  };
}
