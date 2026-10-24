import { useRef, useState } from "react";
import { useLocale } from "./LocaleProvider";
import { ReviewDialog } from "./ReviewDialog";
import { type Abi, type Address, type Hex } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { EXPLORER } from "~~/lib/parasite/constants";
import type { Pair } from "~~/lib/parasite/types";

export const deploymentStorageKey = (owner: string) => `parasite:demo:10143:${owner.toLowerCase()}`;

/** Optional self-service deployment: the connected owner signs each testnet creation. */
export function DeployDemo({ onReady }: { onReady: (pairs: Pair[]) => void }) {
  const { t } = useLocale();
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: 10143 });
  const { data: wallet } = useWalletClient();
  const [status, setStatus] = useState("");
  const [hash, setHash] = useState<Hex>();
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const lock = useRef(false);

  async function deploy() {
    if (lock.current || !address || chainId !== 10143 || !client || !wallet) return;
    lock.current = true;
    setReview(false);
    setBusy(true);
    const owner = address;
    try {
      if ((await client.getChainId()) !== 10143) throw new Error("RPC is not Monad Testnet");
      const artifacts = await import("~~/lib/parasite/demoArtifacts.json");
      let saved: { token?: Address; spender?: Address } = {};
      try {
        saved = JSON.parse(localStorage.getItem(deploymentStorageKey(owner)) || "{}");
      } catch {
        /* Start fresh if browser storage was corrupted. */
      }
      for (const kind of ["token", "spender"] as const) {
        if (saved[kind]) {
          if (!(await client.getBytecode({ address: saved[kind]! })))
            throw new Error("Saved deployment has no bytecode. Use the configured deployment script to recover.");
          continue;
        }
        if (
          (await wallet.getChainId()) !== 10143 ||
          (await wallet.getAddresses())[0]?.toLowerCase() !== owner.toLowerCase()
        )
          throw new Error("Wallet changed. Reconnect the original owner and resume.");
        setStatus(`Confirm ${kind === "token" ? "DemoToken" : "DemoSpender"} deployment in your wallet.`);
        const artifact = kind === "token" ? artifacts.DemoToken : artifacts.DemoSpender;
        const tx = await wallet.deployContract({
          account: owner,
          chain: wallet.chain,
          abi: artifact.abi as Abi,
          bytecode: artifact.bytecode as Hex,
          args: kind === "token" ? [owner] : [],
        });
        setHash(tx);
        setStatus(`Waiting for ${kind} deployment confirmation…`);
        const receipt = await client.waitForTransactionReceipt({ hash: tx, confirmations: 2, timeout: 180_000 });
        if (receipt.status !== "success" || !receipt.contractAddress)
          throw new Error("Deployment did not confirm successfully.");
        saved[kind] = receipt.contractAddress;
        localStorage.setItem(deploymentStorageKey(owner), JSON.stringify(saved));
      }
      if (
        (await wallet.getChainId()) !== 10143 ||
        (await wallet.getAddresses())[0]?.toLowerCase() !== owner.toLowerCase()
      )
        throw new Error("Deployment saved for the original wallet. Reconnect it to scan.");
      setStatus("Demo contracts confirmed. 10,000 PDEM were minted to this wallet. Create an approval below.");
      onReady([{ token: saved.token!, spender: saved.spender!, name: "The Overseer" }]);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Deployment failed. No approval was created.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="browser-deploy">
      <h3>{t("Deploy with your connected wallet")}</h3>
      <p className="micro">
        {" "}
        {t(
          "No developer key needed. Sign two contract deployments on Monad Testnet: a fixed 10,000 PDEM supply minted to you, then a demo spender with no withdrawal function. Uses test MON for gas. Confirmed addresses stay in this browser for this wallet; partial progress can be resumed.",
        )}{" "}
      </p>
      <button className="secondary" disabled={busy || !address || chainId !== 10143} onClick={() => setReview(true)}>
        {busy ? t("DEPLOYMENT IN PROGRESS…") : t("DEPLOY / RESUME DEMO CONTRACTS ↗")}
      </button>
      {review && (
        <ReviewDialog title={t("Deploy with your connected wallet")} onClose={() => setReview(false)}>
          <p>
            {t(
              "No developer key needed. Sign two contract deployments on Monad Testnet: a fixed 10,000 PDEM supply minted to you, then a demo spender with no withdrawal function. Uses test MON for gas. Confirmed addresses stay in this browser for this wallet; partial progress can be resumed.",
            )}
          </p>
          <p>
            {t(
              "Contract creation does not grant token spending allowance. This is demo preparation, not the normal permission-revocation flow.",
            )}
          </p>
          <div className="button-row">
            <button className="secondary" onClick={() => setReview(false)}>
              {t("CANCEL")}
            </button>
            <button className="primary" onClick={() => void deploy()}>
              {t("UNDERSTOOD — OPEN WALLET")}
            </button>
          </div>
        </ReviewDialog>
      )}
      {status && (
        <p role="status" className="micro">
          {t(status)}
        </p>
      )}
      {hash && (
        <a className="micro" target="_blank" rel="noreferrer" href={`${EXPLORER}/tx/${hash}`}>
          {" "}
          {t("VIEW DEPLOYMENT TRANSACTION ↗")}{" "}
        </a>
      )}
    </div>
  );
}
