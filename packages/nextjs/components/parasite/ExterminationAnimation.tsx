import { useEffect } from "react";
import type { CSSProperties } from "react";
import { useLocale } from "./LocaleProvider";
import { ParasiteCreature } from "./ParasiteCreature";

export function ExterminationAnimation({ seed, onComplete }: { seed: string; onComplete: () => void }) {
  const { t } = useLocale();
  useEffect(() => {
    const timeout = setTimeout(onComplete, 2300);
    return () => clearTimeout(timeout);
  }, [onComplete]);
  return (
    <div className="extermination" aria-live="polite">
      <div className="permission-shatter" aria-hidden="true">
        <div className="shatter-ring" />
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} style={{ "--angle": `${i * 20}deg`, "--distance": `${85 + (i % 4) * 22}px` } as CSSProperties} />
        ))}
      </div>
      <div className="dissolving-creature">
        <ParasiteCreature seed={seed} />
      </div>
      <strong>{t("ACCESS EXTINGUISHED.")}</strong>
      <span>{t("Receipt confirmed · Allowance verified zero")}</span>
    </div>
  );
}
