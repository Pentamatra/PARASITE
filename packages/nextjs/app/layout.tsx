import "@rainbow-me/rainbowkit/styles.css";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import { LocaleProvider } from "~~/components/parasite/LocaleProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "PARASITE — Cüzdanın Hâlâ Canlı",
  description: "Keşfet. Anla. Yok et. Monad Test Ağı üzerinde desteklenen cüzdan izinlerini keşfet ve yönet.",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <LocaleProvider>
          <ThemeProvider enableSystem>
            <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
