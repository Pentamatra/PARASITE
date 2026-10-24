import { useLocale } from "./LocaleProvider";

export function PermissionEducation() {
  const { t } = useLocale();
  return (
    <details className="permission-education">
      <summary>{t("I LEFT THE DAPP. WHY IS THE PERMISSION STILL HERE?")}</summary>
      <div className="education-columns">
        <div>
          <strong>{t("Wallet connection")}</strong>
          <p>
            {t(
              "Connecting lets a site see your selected address and request actions. Connecting alone does not grant an ERC20 spending allowance.",
            )}
          </p>
        </div>
        <div>
          <strong>{t("Token authorization")}</strong>
          <p>
            {t(
              "An approve transaction records a spender and amount in the token contract. Disconnecting the site does not erase that onchain allowance.",
            )}
          </p>
        </div>
      </div>
      <p>
        {t(
          "To remove a supported token authorization, set its allowance to zero. PARASITE waits for the transaction and independently checks the result. A zero allowance does not revoke unrelated signatures or other token permissions.",
        )}
      </p>
    </details>
  );
}
