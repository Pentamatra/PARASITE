"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddPermission } from "./AddPermission";
import { type ApprovalIntent, ApprovalReview } from "./ApprovalReview";
import { ComparisonDemo, comparisonKey } from "./ComparisonDemo";
import { DemoSetup } from "./DemoSetup";
import { DeployDemo, deploymentStorageKey } from "./DeployDemo";
import { ExposureSimulation } from "./ExposureSimulation";
import { ExterminationAnimation } from "./ExterminationAnimation";
import { FieldGuide } from "./FieldGuide";
import { Journey } from "./Journey";
import { useLocale } from "./LocaleProvider";
import { ParasiteCreature } from "./ParasiteCreature";
import { ParasiteInspector } from "./ParasiteInspector";
import { ParasiteOrbit } from "./ParasiteOrbit";
import { PermissionChanges } from "./PermissionChanges";
import { PermissionEducation } from "./PermissionEducation";
import { SecurityReport } from "./SecurityReport";
import { TransactionRecovery } from "./TransactionRecovery";
import { WalletCore } from "./WalletCore";
import { useApprovalTransactions } from "./useApprovalTransactions";
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";
import { type PublicClient, type WalletClient, erc20Abi, isAddress, maxUint256, parseUnits } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { COVERAGE, EXPLORER } from "~~/lib/parasite/constants";
import { supportedPairs } from "~~/lib/parasite/discovery/knownContracts";
import { amount } from "~~/lib/parasite/formatting";
import { MAX_PAIRS, customPairsKey, mergePairs, pairKey, parseCustomPairs } from "~~/lib/parasite/pairs";
import { discover } from "~~/lib/parasite/permissions";
import { explain } from "~~/lib/parasite/riskRules";
import { selectPermission } from "~~/lib/parasite/selection";
import { simulationPermissions } from "~~/lib/parasite/simulation";
import type { Pair, Permission, Revocation, Scan, VerifiedApproval } from "~~/lib/parasite/types";

type Screen = "awaken" | "xray" | "setup" | "report";
const baseConfig = supportedPairs();

export function ParasiteApp() {
  const { t, locale, setLocale } = useLocale();
  const [motionPaused, setMotionPaused] = useState(false);
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: 10143 });
  const { data: wallet } = useWalletClient();
  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();
  const [screen, setScreen] = useState<Screen>("awaken");
  const [simulation, setSimulation] = useState(false);
  const [scan, setScan] = useState<Scan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>();
  const [vision, setVision] = useState(false);
  const [intent, setIntent] = useState<ApprovalIntent>();
  const [addingPair, setAddingPair] = useState(false);
  const [extraPairs, setExtraPairs] = useState<Pair[]>([]);
  const [error, setError] = useState("");
  const [revocations, setRevocations] = useState<Revocation[]>([]);
  const [before, setBefore] = useState<number | null>(null);
  const [gas, setGas] = useState<bigint | null>(null);
  const [browserPairs, setBrowserPairs] = useState<Pair[]>([]);
  const [deploymentBusy, setDeploymentBusy] = useState(false);
  const [exterminated, setExterminated] = useState<string>();
  const config = useMemo(() => {
    const pairs = mergePairs(baseConfig.pairs, browserPairs, extraPairs);
    return pairs.length ? { pairs } : baseConfig;
  }, [browserPairs, extraPairs]);
  const finishAnimation = useCallback(() => setExterminated(undefined), []);
  useEffect(() => {
    setBrowserPairs([]);
    setExtraPairs([]);
    setAddingPair(false);
    if (!address) return;
    try {
      setExtraPairs(parseCustomPairs(localStorage.getItem(customPairsKey(address)) || "{}"));
    } catch {
      /* Fresh reads remain available without persistence. */
    }
    try {
      const saved = JSON.parse(localStorage.getItem(deploymentStorageKey(address)) || "{}");
      if (isAddress(saved.token) && isAddress(saved.spender))
        setBrowserPairs([{ token: saved.token, spender: saved.spender, name: "The Overseer", origin: "demo" }]);
      const second = JSON.parse(localStorage.getItem(comparisonKey(address)) || "{}");
      const token = baseConfig.pairs[0]?.token || saved.token;
      if (
        second.version === 1 &&
        second.owner?.toLowerCase() === address.toLowerCase() &&
        isAddress(second.address) &&
        isAddress(token)
      )
        setBrowserPairs(previous =>
          mergePairs(previous, [{ token, spender: second.address, name: "Ember 01", origin: "demo" }]),
        );
    } catch {
      /* Missing configuration remains visibly unavailable. */
    }
  }, [address]);
  const recoveryBaselineUnknown = useRef(false);
  const baselineIdentity = useRef("");
  const generation = useRef(0);
  const identity = `${address}:${chainId}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  const refresh = useCallback(async () => {
    if (!client || !address || chainId !== 10143) return;
    const id = ++generation.current;
    const captured = `${address}:${chainId}`;
    setScanning(true);
    setError("");
    try {
      const result = await discover(client as PublicClient, address, config.pairs);
      const nativeBalance = await client.getBalance({ address }).catch(() => null);
      if (id !== generation.current || identityRef.current !== captured) return;
      setScan(result);
      setGas(nativeBalance);
      if (!recoveryBaselineUnknown.current)
        setBefore(previous => (previous === null ? result.permissions.filter(p => p.allowance > 0n).length : previous));
    } catch (e) {
      if (id === generation.current && identityRef.current === captured) {
        setScan(null);
        setError(e instanceof Error ? e.message : "Discovery unavailable");
      }
    } finally {
      if (id === generation.current) setScanning(false);
    }
  }, [client, address, chainId, config]);

  useEffect(() => {
    if (baselineIdentity.current !== identityRef.current) {
      baselineIdentity.current = identityRef.current;
      recoveryBaselineUnknown.current = false;
    }
    ++generation.current;
    setScan(null);
    setGas(null);
    setBefore(null);
    setRevocations([]);
    setSelectedKey(undefined);
    setVision(false);
    setIntent(undefined);
    setError("");
    setScanning(false);
    setExterminated(undefined);
    void refresh();
  }, [refresh]);

  const onRecoveryFound = useCallback(() => {
    recoveryBaselineUnknown.current = true;
    setBefore(null);
  }, []);
  const onVerified = useCallback(
    async (proof: VerifiedApproval, recovered: boolean) => {
      if (recovered) onRecoveryFound();
      if (proof.requestedAllowance === 0n) {
        const key = `10143:${proof.owner}:${proof.token}:${proof.spender}`.toLowerCase();
        setExterminated(key);
        setRevocations(items =>
          items.some(item => item.hash === proof.hash)
            ? items
            : [
                ...items,
                {
                  key,
                  hash: proof.hash,
                  owner: proof.owner,
                  token: proof.token,
                  spender: proof.spender,
                  time: proof.verifiedAt,
                  receiptBlock: proof.receiptBlock,
                  verificationBlock: proof.verificationBlock,
                },
              ],
        );
        setScan(previous =>
          previous
            ? {
                ...previous,
                permissions: previous.permissions.map(p =>
                  p.key === key
                    ? {
                        ...p,
                        allowance: 0n,
                        exposure: 0n,
                        formattedAllowance: "0",
                        unlimited: false,
                        category: "NO CURRENT ALLOWANCE",
                        block: proof.verificationBlock,
                        verifiedAt: proof.verifiedAt,
                        explanation: explain(0n, p.balance),
                      }
                    : p,
                ),
              }
            : previous,
        );
      } else {
        recoveryBaselineUnknown.current = false;
        setBefore(null);
        setRevocations([]);
      }
      await refresh();
    },
    [refresh, onRecoveryFound],
  );
  const transactions = useApprovalTransactions({
    owner: address,
    chainId,
    client: client as PublicClient | undefined,
    wallet: wallet as WalletClient | undefined,
    onVerified,
    onRecoveryFound,
  });
  const { txState, txHash } = transactions;
  const busy =
    deploymentBusy ||
    transactions.working ||
    !transactions.ready ||
    !!transactions.pending ||
    transactions.invalidRecord;

  const liveActive = scan?.permissions.filter(p => p.allowance > 0n) ?? [];
  const active = simulation ? simulationPermissions : liveActive;
  const selectable = simulation ? simulationPermissions : (scan?.permissions ?? []);
  const selected = selectPermission(selectable, selectedKey);
  const select = (p: Permission) => {
    setSelectedKey(p.key);
    setVision(false);
  };

  async function transact(pair: Pair, value: bigint) {
    if (busy || simulation) return;
    if (!client || !wallet || !address) {
      openConnectModal?.();
      return;
    }
    setError("");
    setVision(false);
    const permission = scan?.permissions.find(
      p => p.token.toLowerCase() === pair.token.toLowerCase() && p.spender.toLowerCase() === pair.spender.toLowerCase(),
    );
    setIntent({ owner: address, pair, value, permission, decimals: permission?.decimals ?? null });
  }
  async function approveDemo(pair: Pair, unlimited: boolean) {
    if (!client || busy) return;
    try {
      const decimals = await client.readContract({ address: pair.token, abi: erc20Abi, functionName: "decimals" });
      await transact(pair, unlimited ? maxUint256 : parseUnits("250", decimals));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Token metadata unavailable. Raw units are preserved.");
    }
  }
  const startScan = () => {
    setSimulation(false);
    setScreen("xray");
    if (!address) openConnectModal?.();
    else if (!transactions.working) void refresh();
  };
  return (
    <div className={`parasite-app ${motionPaused ? "motion-paused" : ""}`} data-language={locale}>
      <header className="parasite-header">
        <button className="brand" onClick={() => setScreen("awaken")} aria-label={t("PARASITE home")}>
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path
              d="m16 2 12 7v14l-12 7L4 23V9Z M16 8v16M9 12l14 8M9 20l14-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
          </svg>
          PARASITE
        </button>
        <nav aria-label={t("Main navigation")}>
          <button className={screen === "xray" ? "active" : ""} onClick={startScan}>
            {" "}
            {t("WALLET X-RAY")}{" "}
          </button>
          <button
            className={screen === "setup" ? "active" : ""}
            onClick={() => {
              setSimulation(false);
              setScreen("setup");
            }}
          >
            {" "}
            {t("DEMO SETUP")}{" "}
          </button>
          <button
            className={screen === "report" ? "active" : ""}
            onClick={() => {
              setSimulation(false);
              setScreen("report");
            }}
          >
            {" "}
            {t("REPORT")}{" "}
          </button>
        </nav>
        <div className="header-right">
          <div className="language-toggle" role="group" aria-label={locale === "tr" ? "Dil seçimi" : "Language"}>
            <button aria-pressed={locale === "tr"} onClick={() => setLocale("tr")}>
              TR
            </button>
            <span>/</span>
            <button aria-pressed={locale === "en"} onClick={() => setLocale("en")}>
              EN
            </button>
          </div>
          <span className="network-badge">
            <i /> {t("MONAD TESTNET")}{" "}
          </span>
          <ConnectButton chainStatus="none" showBalance={false} accountStatus="address" />
        </div>
      </header>
      <p className="testnet-context">
        {t(
          "You are using Monad Testnet. Transactions take place on a test network; demo tokens have no monetary value.",
        )}
      </p>
      {simulation && (
        <div className="simulation-banner" role="status">
          {" "}
          {t("SIMULATION — ILLUSTRATIVE DATA · NOT YOUR WALLET · NO FUNDS MOVED")}{" "}
          <button onClick={startScan}>{t("EXIT / SCAN LIVE →")}</button>
        </div>
      )}
      {address && chainId !== 10143 && (
        <div className="network-warning">
          {" "}
          {t("Wrong network. Live discovery and transactions require Monad Testnet.")}{" "}
          <button onClick={() => switchChain({ chainId: 10143 })}>{t("SWITCH NETWORK →")}</button>
        </div>
      )}
      {screen === "awaken" && (
        <section className="landing">
          <div className="landing-copy">
            <div className="eyebrow">
              <span className="tiny-cross">＋</span> {t("WALLET PERMISSION INTELLIGENCE")}{" "}
            </div>
            <h1 aria-label={`${t("YOUR WALLET")} ${t("IS")} ${t("ALIVE.")}`}>
              {" "}
              {t("YOUR WALLET")} <br /> {t("IS")} <span>{t("ALIVE.")}</span>
            </h1>
            <p className="landing-subtitle">{t("Some permissions never leave.")}</p>
            <p className="landing-description">
              {" "}
              {t("They linger. They attach. They keep their access.")} <br />{" "}
              {t("Meet the permissions living inside your wallet.")}{" "}
            </p>
            <div className="button-row">
              <button className="primary" onClick={startScan}>
                {" "}
                {t("SCAN MY WALLET")} <span>↗</span>
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setSimulation(true);
                  setSelectedKey(undefined);
                  setScreen("xray");
                }}
              >
                {" "}
                {t("EXPLORE THE DEMO")} <span>→</span>
              </button>
            </div>
            <p className="micro">{t("Discover supported token approvals and control their access.")}</p>
            <div className="landing-footnote">
              <span>{t("01 / DISCOVER")}</span>
              <span>{t("02 / UNDERSTAND")}</span>
              <span>{t("03 / EXTERMINATE")}</span>
            </div>
          </div>
          <div className="hero-organism">
            <div className="hero-grid" />
            <div className="radar-ring ring-a" />
            <div className="radar-ring ring-b" />
            <WalletCore infected />
            <div className="hero-parasite p-one">
              <ParasiteCreature seed="hero1" />
            </div>
            <div className="hero-parasite p-two">
              <ParasiteCreature seed="hero2" tone="amber" />
            </div>
            <div className="hero-parasite p-three">
              <ParasiteCreature seed="hero3" tone="cyan" />
            </div>
            <div className="hero-label label-one">
              <i /> {t("PERMISSION ORGANISMS")}
              <span>{t("ILLUSTRATION / NOT A SCAN")}</span>
            </div>
            <div className="hero-label label-two">
              {" "}
              {t("THE WALLET IS YOURS.")} <br />
              <span>{t("IS THE ACCESS?")}</span>
            </div>
            <svg className="hero-tendrils" viewBox="0 0 600 600" aria-hidden="true">
              <path
                d="M300 300Q230 130 165 140M300 300Q470 230 475 210M300 300Q400 450 420 470"
                stroke="#f467ad"
                strokeOpacity=".45"
                fill="none"
              />
            </svg>
          </div>
          <div className="landing-bottom">
            <span>
              {" "}
              {t("BUILT ON")} <b>◈ MONAD</b>
            </span>
            <p>{t("Discover. Understand. Exterminate.")}</p>
            <span>{t("SCROLL INTO THE UNKNOWN ↓")}</span>
          </div>
        </section>
      )}
      {screen === "awaken" && <FieldGuide />}
      {screen !== "awaken" && (
        <Journey stage={screen === "setup" ? 0 : screen === "report" ? 3 : transactions.working || intent ? 2 : 1} />
      )}
      {screen === "xray" && (
        <section className="scan-screen">
          <div className="scan-heading">
            <div>
              <div className="eyebrow">{simulation ? t("SIMULATION") : t("LIVE PERMISSION DISCOVERY")} / 01</div>
              <h1 aria-label={`${t("WALLET")} ${t("X-RAY.")}`}>
                {" "}
                {t("WALLET")} <span>{t("X-RAY.")}</span>
              </h1>
              <p>
                {simulation
                  ? t("An illustrative ecosystem. Explore how permissions work.")
                  : address
                    ? t("Your authorizations. Made visible.")
                    : t("Connect one wallet to verify supported permissions.")}
              </p>
            </div>
            <button
              className="secondary"
              onClick={() => void refresh()}
              disabled={scanning || busy || simulation || !address || chainId !== 10143}
            >
              {scanning ? t("VERIFYING…") : t("REFRESH SCAN ↻")}
            </button>
          </div>
          <div className="scan-metrics">
            <div>
              <strong>{simulation ? "03" : scan ? String(liveActive.length).padStart(2, "0") : "—"}</strong>
              <span>{t("ACTIVE PERMISSIONS")}</span>
            </div>
            <div>
              <strong className="pink">
                {simulation ? "01" : scan ? liveActive.filter(p => p.category === "HIGH EXPOSURE").length : "—"}
              </strong>
              <span>{t("HIGH EXPOSURE")}</span>
            </div>
            <div>
              <strong>
                {simulation ? "—" : (scan?.permissions.length ?? "—")}
                <small> / {config.pairs.length}</small>
              </strong>
              <span>{t("SUPPORTED PAIRS VERIFIED")}</span>
            </div>
            <div className="metric-note">
              <i />
              {simulation
                ? t("ILLUSTRATIVE VALUES")
                : scanning
                  ? t("READING ONCHAIN STATE")
                  : scan
                    ? t(`BLOCK ${scan.block}`)
                    : t("AWAITING VERIFIED DATA")}
            </div>
          </div>
          {!simulation && config.error && (
            <div className="notice">
              {" "}
              {t("DISCOVERY UNAVAILABLE —")} {t(config.error)}{" "}
              <button onClick={() => setScreen("setup")}>{t("OPEN DEMO SETUP ↗")}</button>
            </div>
          )}
          {!simulation && (
            <div className="permission-tools">
              <button
                className="secondary"
                disabled={!address || chainId !== 10143 || busy || scanning || config.pairs.length >= MAX_PAIRS}
                onClick={() => setAddingPair(true)}
              >
                {t("VERIFY / ADD A PERMISSION")}
              </button>
              <p className="micro">
                {t("Adding coverage starts a new report baseline. Download the current report first if you need it.")}
              </p>
            </div>
          )}
          <div className="xray-layout">
            <ParasiteOrbit
              permissions={active}
              selected={selected?.key}
              onSelect={select}
              simulation={simulation}
              scanning={scanning}
            />
            <ParasiteInspector
              permission={selected}
              busy={busy}
              simulation={simulation}
              onSimulate={() => setVision(true)}
              onRevoke={() => selected && void transact(selected, 0n)}
            />
          </div>
          {!simulation && extraPairs.length > 0 && (
            <details className="permission-education">
              <summary>{t("MANAGE CHECKED PAIRS")}</summary>
              <p className="micro">
                {t(
                  "Removing a pair from coverage does not revoke its onchain allowance. Report coverage and baseline will change.",
                )}
              </p>
              {extraPairs.map(pair => (
                <div className="coverage-entry" key={`${pair.token}:${pair.spender}`}>
                  <code>
                    {pair.token} / {pair.spender}
                  </code>
                  <button
                    className="secondary"
                    disabled={busy || scanning}
                    onClick={() => {
                      const next = extraPairs.filter(p => p.token !== pair.token || p.spender !== pair.spender);
                      setExtraPairs(next);
                      if (address)
                        try {
                          localStorage.setItem(customPairsKey(address), JSON.stringify({ version: 1, pairs: next }));
                        } catch {
                          setError("Browser storage is unavailable.");
                        }
                    }}
                  >
                    {t("STOP CHECKING THIS PAIR")}
                  </button>
                </div>
              ))}
            </details>
          )}
          <PermissionEducation />
          {!simulation && address && chainId === 10143 && (
            <PermissionChanges key={address} owner={address} scan={scan} />
          )}
          <div className="permission-list">
            <div className="panel-eyebrow">
              {" "}
              {t("PERMISSION INVENTORY")} <span>{simulation ? t("SIMULATED") : t("CURRENT VERIFIED STATE")}</span>
            </div>
            {(simulation ? simulationPermissions : (scan?.permissions ?? [])).map(p => (
              <button className="permission-row" key={p.key} onClick={() => select(p)}>
                <span className={p.unlimited ? "pink" : "amber"}>◉</span>
                <strong>{t(p.name)}</strong>
                <span>{p.symbol}</span>
                <span>
                  {p.allowance === 0n
                    ? t("VERIFIED ZERO")
                    : p.unlimited
                      ? t("UNLIMITED")
                      : amount(p.allowance, p.decimals)}
                </span>
                <span>{t(p.category)} ↗</span>
              </button>
            ))}
            {scan?.failures.map(f => (
              <p className="warning" key={f.pair.spender}>
                {t(f.status)} · {t(f.pair.name)}: {t(f.message.slice(0, 180))}
              </p>
            ))}
            <p className="micro">
              {t(COVERAGE)} {t("No contract reputation or maliciousness is inferred.")}
            </p>
          </div>
        </section>
      )}
      {screen === "setup" && (
        <>
          {!config.pairs.length && (
            <DeployDemo onReady={pairs => setBrowserPairs(pairs.map(p => ({ ...p, origin: "demo" })))} />
          )}
          {address && client && config.pairs.filter(p => p.origin === "demo").length === 1 && (
            <ComparisonDemo
              key={address}
              owner={address}
              chainId={chainId}
              token={config.pairs.find(p => p.origin === "demo")!.token}
              client={client as PublicClient}
              wallet={wallet as WalletClient | undefined}
              disabled={busy || scanning}
              onReady={pair => setBrowserPairs(previous => mergePairs(previous, [pair]))}
              onBusyChange={setDeploymentBusy}
            />
          )}
          <DemoSetup
            owner={address}
            chainId={chainId}
            gas={gas}
            pairs={config.pairs.filter(p => p.origin === "demo")}
            scan={scan}
            busy={busy || scanning}
            error={config.error}
            onCheck={() => {
              if (!address) openConnectModal?.();
              else if (chainId !== 10143) switchChain({ chainId: 10143 });
              else void refresh();
            }}
            onApprove={(pair, unlimited) => void approveDemo(pair, unlimited)}
            onEnter={startScan}
          />
        </>
      )}
      {screen === "report" && <SecurityReport before={before} scan={scan} revocations={revocations} owner={address} />}
      {(txState !== "IDLE" || error || transactions.error) && (
        <div
          className={`transaction-strip ${txState === "SUCCESS" ? "tx-success" : ""}`}
          role="status"
          aria-live="polite"
        >
          <div>
            <strong>{t(txState.replaceAll("_", " "))}</strong>
            {error && <p>{t(error.slice(0, 600))}</p>}
            {transactions.error && <p>{t(transactions.error.slice(0, 600))}</p>}
            {txState === "SUCCESS" && (
              <span>{t("Onchain receipt confirmed. Allowance independently re-read and verified.")}</span>
            )}
          </div>
          {txHash && (
            <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">
              {" "}
              {t("VIEW TRANSACTION ↗")}{" "}
            </a>
          )}
          {(transactions.pending || transactions.invalidRecord || transactions.proof) && (
            <a href="#approval-evidence">{t("TRANSACTION VERIFICATION")} ↓</a>
          )}
          {txState === "SUCCESS" && revocations.length > 0 && (
            <button onClick={() => setScreen("report")}>{t("VIEW REPORT →")}</button>
          )}
        </div>
      )}
      <TransactionRecovery key={`${address}:${chainId}`} transactions={transactions} correctChain={chainId === 10143} />
      <footer className="parasite-footer">
        <button className="motion-control" aria-pressed={motionPaused} onClick={() => setMotionPaused(v => !v)}>
          {locale === "tr"
            ? motionPaused
              ? "HAREKETİ AÇ"
              : "HAREKETİ DURDUR"
            : motionPaused
              ? "ENABLE MOTION"
              : "PAUSE MOTION"}
        </button>
        <span>
          PARASITE <b> {t("/ YOUR WALLET IS ALIVE")}</b>
        </span>
        <p>{t("PARASITE checks supported approval relationships. It is not a full wallet security audit.")}</p>
        <span>{t("MONAD HACKATHON / 2026")}</span>
      </footer>
      {exterminated && !simulation && <ExterminationAnimation seed={exterminated} onComplete={finishAnimation} />}
      {intent && (
        <ApprovalReview
          intent={intent}
          onClose={() => setIntent(undefined)}
          onConfirm={() => {
            const reviewed = intent;
            setIntent(undefined);
            if (simulation || busy || chainId !== 10143 || address?.toLowerCase() !== reviewed.owner.toLowerCase())
              return;
            void transactions.submit(reviewed.pair, reviewed.value);
          }}
        />
      )}
      {addingPair && address && chainId === 10143 && client && !busy && (
        <AddPermission
          key={`${address}:${chainId}`}
          capacity={MAX_PAIRS - config.pairs.length}
          existingKeys={config.pairs.map(pairKey)}
          owner={address}
          client={client as PublicClient}
          onClose={() => setAddingPair(false)}
          onAdd={pairs => {
            const combined = mergePairs(config.pairs, pairs).filter(
              p => p.origin === "manual" || p.origin === "history",
            );
            setExtraPairs(combined);
            try {
              localStorage.setItem(customPairsKey(address), JSON.stringify({ version: 1, pairs: combined }));
            } catch {
              setError("Browser storage is unavailable.");
            }
            setAddingPair(false);
          }}
        />
      )}
      {vision && selected && (
        <ExposureSimulation
          permission={selected}
          onClose={() => setVision(false)}
          simulation={simulation}
          busy={busy}
          onRevoke={() => void transact(selected, 0n)}
        />
      )}
    </div>
  );
}
