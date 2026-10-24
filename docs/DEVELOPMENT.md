# PARASITE developer guide

[English overview](../README.md) · [Türkçe](../README.tr.md)

## Architecture

The application runs within the original Monad Scaffold-ETH monorepo. Existing providers, wallet connectors, App Router, debug tools, and block explorer remain in place.

- `packages/nextjs/app/page.tsx` mounts the application.
- `components/parasite/ParasiteApp.tsx` coordinates identity-scoped scan and report state.
- `lib/parasite/permissions.ts` reads allowances and metadata at a fixed block; missing balances or decimals remain unknown.
- `discovery/knownContracts.ts` loads explicit demo relationships. Environment overrides take precedence over the deployment manifest. Browser-confirmed relationships and manually verified additions are merged without duplicate addresses.
- `discovery/approvalLogs.ts` bounds per-token event discovery, adapts block chunks to provider limits, deduplicates relationships, rejects reorg uncertainty, and re-reads allowances.
- `riskRules.ts` and `exposure.ts` use exact bigint arithmetic. Current exposure is the smaller of balance and allowance; the unlimited display threshold is `2 ** 255` raw units.
- `transactions.ts` checks chain, owner, fresh allowance, simulated call, full transaction intent, two receipt confirmations, and the independently read result.
- `pendingApproval.ts` saves versioned public transaction metadata by wallet and chain. The hook uses submission locks and guards stale identities.
- `submissionRecovery.ts` looks for matching newly submitted Approval events if a wallet broadcasts without returning a hash. It checks full transaction intent before handing the hash to normal receipt verification.
- `rpcVisibility.ts` retries only transient transaction-not-found results, up to 20 reads spaced 750 ms apart. Exhaustion remains unresolved; it never becomes fabricated success.
- `changes.ts` handles opt-in browser-local comparison. Failed reads preserve previous observations instead of becoming zero.
- `reportCard.ts` generates escaped standalone SVG reports. Session history is not durable storage.

Animations never determine security state. The exposure visualization is local math and never calls `transferFrom`.

## Local development

Use Yarn 3.2.3 from the repository root. On Windows PowerShell:

```powershell
yarn.cmd install --immutable
yarn.cmd start
```

The normal development server is `http://localhost:3000`. To check and serve an optimized build:

```powershell
yarn.cmd next:build
yarn.cmd next:serve
```

Stop an existing server before building/serving another process against the same `.next` output. Do not bypass build errors with `NEXT_PUBLIC_IGNORE_BUILD_ERROR`.

## Frontend environment

Template: [`packages/nextjs/.env.example`](../packages/nextjs/.env.example). Copy it to `.env.local` in that package if needed.

- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: WalletConnect connection configuration.
- `NEXT_PUBLIC_MONAD_RPC_URL`: optional RPC override; responses must identify chain 10143.
- `NEXT_PUBLIC_PARASITE_TOKEN`: optional confirmed demo token address.
- `NEXT_PUBLIC_PARASITE_SPENDERS`: optional comma-separated confirmed demo spender addresses. The first is the unlimited preparation target; subsequent demo targets use 250 tokens.

Defaults are recorded in [`deployment.json`](../packages/nextjs/lib/parasite/deployment.json). Changing that manifest requires a frontend rebuild. Public addresses are configuration, not proof of current balances or allowances.

**All `NEXT_PUBLIC_` values are visible to browsers. Never put signing secrets there.** No frontend private key is required.

## Deploy your own demo

The bundled contracts already exist and are readable. Their fixed PDEM supply belongs to the deployment recipient, not automatically to every wallet connecting to the app.

For maintainer-controlled deployment, configure `packages/hardhat/.env` privately using its example:

- `DEPLOYER_PRIVATE_KEY`: a funded testnet-only signer.
- `DEMO_OWNER_ADDRESS`: the fixed-supply recipient; defaults to the deployer.
- `MONAD_RPC_URL`: optional RPC override.
- `PARASITE_RESET`: `false` prepares allowances; `true` removes them through the preparation script.

The deployment script verifies chain **10143**, deploys DemoToken and two DemoSpenders, and records confirmed addresses:

```powershell
yarn.cmd deploy --network monadTestnet --tags Parasite
```

**Existing-manifest guard:** the tracked public deployment is protected. This checkout refuses to overwrite an existing address manifest when matching Hardhat deployment records are absent. A new independent deployment needs an intentionally prepared separate deployment configuration; do not remove the guard or overwrite existing addresses to make the command pass.

For a configuration with no demo contracts, the application also exposes wallet-mediated deployment preparation. It does not automatically mint again, create approvals, or bypass the existing manifest. A second spender can be created or recovered through a separate explicit flow.

If the configured signer is the PDEM owner, prepare the test approvals:

```powershell
yarn.cmd workspace @se-2/hardhat exec hardhat run scripts/prepareParasite.ts --network monadTestnet
```

The script grants unlimited allowance to the first configured demo spender and 250 PDEM to the second. With `PARASITE_RESET=true`, it instead sets those allowances to zero. It checks the testnet and modifies only demo allowances; it does not transfer assets or print private keys. The connected-wallet Test Area is the alternative for interactive preparation.

## Read-only verification tools

Compile the local artifacts before comparing runtime code:

```powershell
yarn.cmd compile
yarn.cmd workspace @se-2/nextjs node scripts/verifyParasiteDemo.mjs <owner> <token> <spender>
```

The checker verifies chain ID, pins contract reads to one block, compares runtime bytecodes against compiled artifacts, and reads symbol, decimals, balance, and allowance. It never signs.

Verify an existing approval transaction against its expected raw allowance:

```powershell
yarn.cmd workspace @se-2/hardhat exec ts-node scripts/checkParasiteApproval.ts <owner> <token> <spender> <tx-hash> <raw-allowance>
```

Optional bounded history and recovery checks:

```powershell
yarn.cmd workspace @se-2/hardhat exec ts-node scripts/checkParasiteHistory.ts <owner> <token> <from-block> <to-block>
yarn.cmd workspace @se-2/hardhat exec ts-node scripts/recoverParasiteApproval.ts <owner> <token> <spender> <raw-allowance> <from-block> <to-block>
yarn.cmd workspace @se-2/nextjs node scripts/recoverComparison.mjs <owner> <confirmed-nonce> <earliest-block>
```

These tools use public RPC data only. Historical nonce recovery requires provider support for historical account reads. Do not interpret a timeout or missing RPC response as proof that a signed transaction was never broadcast.

## Validation

```powershell
yarn.cmd hardhat:test
yarn.cmd next:check-types
yarn.cmd hardhat:check-types
yarn.cmd next:lint
yarn.cmd next:build
```

The recorded local result is **78 passing tests** plus successful type checks, frontend lint, and production build. Tests include real local-contract behavior and controlled RPC failure fixtures. Real wallet-mediated Monad Testnet deployments, approvals, revocations, and independent zero reads were completed separately. A new signed transaction is not executed every time documentation or visuals change.

An outdated Browserslist dataset and experimental localStorage warnings appeared in the supplied Node runtime during successful builds. These were informational; build/type errors were not suppressed.

## Hosting

No public frontend deployment is claimed. The app produces a Next.js frontend build compatible with a monorepo-aware hosting setup. A deployment must include the workspace root, Yarn lockfile, package workspace, required public configuration, and a compatible Node runtime. Keep the existing Next.js framework and wallet providers.

Never upload Hardhat `.env` files. Configure secrets only in an appropriate private signer environment; the frontend does not need them. A hosted preview must be verified with the actual wallet and RPC before being described as working.

## Reporting issues

Include the selected network, the step that failed, and a public transaction hash when relevant. Do not include seed phrases, private keys, wallet passwords, `.env` files, or browser storage dumps. A screenshot should hide the full wallet address when it is not needed.
