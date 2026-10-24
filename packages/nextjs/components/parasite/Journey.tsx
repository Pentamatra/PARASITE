import { useLocale } from "./LocaleProvider";

export function Journey({ stage }: { stage: number }) {
  const { t } = useLocale();
  return (
    <ol className="permission-journey" aria-label={t("YOUR PERMISSION JOURNEY")}>
      {["Connect", "Review permissions", "Remove access", "Check the result"].map((label, index) => (
        <li key={label} aria-current={stage === index ? "step" : undefined} data-current={stage === index}>
          <span>0{index + 1}</span>
          {t(label)}
        </li>
      ))}
    </ol>
  );
}
