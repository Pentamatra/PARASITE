const xml = (text: string) =>
  text.replace(/[<>&"']/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);
export function reportCardSvg(data: {
  headline: string;
  wallet: string;
  checked: number;
  before: number | null;
  after: number | null;
  revoked: number;
  time: string;
  labels: [string, string, string];
  limitation: string;
}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img"><title>PARASITE · ${xml(data.headline)}</title><defs><radialGradient id="glow"><stop stop-color="#58305d"/><stop offset="1" stop-color="#0b0911"/></radialGradient></defs><rect width="1200" height="720" fill="#0b0911"/><circle cx="1050" cy="120" r="460" fill="url(#glow)"/><g font-family="Arial, sans-serif" fill="#f3edf8"><text x="64" y="80" font-size="28" letter-spacing="7">PARASITE</text><text x="64" y="170" font-size="36" fill="#e7a5d0">${xml(data.headline)}</text><text x="64" y="220" font-size="19" fill="#b6a8c3">MONAD TESTNET · ${xml(data.wallet)}</text><path d="M64 265H1136M64 500H1136" stroke="#61506f"/><text x="64" y="375" font-size="76">${data.checked}</text><text x="420" y="375" font-size="76">${data.before ?? "—"} → ${data.after ?? "—"}</text><text x="920" y="375" font-size="76" fill="#88dfd7">${data.revoked}</text><text x="64" y="435" font-size="16">${xml(data.labels[0])}</text><text x="420" y="435" font-size="16">${xml(data.labels[1])}</text><text x="920" y="435" font-size="16">${xml(data.labels[2])}</text><text x="64" y="555" font-size="18" fill="#b6a8c3">${xml(data.time)}</text><text x="64" y="610" font-size="17" fill="#b6a8c3">${xml(data.limitation)}</text><text x="64" y="665" font-size="14" fill="#88dfd7">YOUR WALLET IS ALIVE · DISCOVER. UNDERSTAND. EXTERMINATE.</text></g></svg>`;
}
