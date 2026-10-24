import { useLocale } from "./LocaleProvider";

export function FieldGuide() {
  const { locale } = useLocale();
  const tr = locale === "tr";
  const entries = tr
    ? [
        [
          "01",
          "Verdiğin izinleri gör.",
          "Cüzdanını bağla. Hangi adreslere token harcama izni verdiğini desteklenen izinler arasında kontrol et.",
          "ZİNCİRDEN OKUNUR",
        ],
        [
          "02",
          "Neye izin verdiğini anla.",
          "Her iznin kaç tokenı kapsadığını gör. Canlandırmada tokenların yerinden oynamaz.",
          "PARA GÖNDERİLMEZ",
        ],
        [
          "03",
          "İstemediğin izni kaldır.",
          "İptali kendi cüzdanından onayla. İşlem tamamlanıp izin sıfırlandığında sonucu burada gör.",
          "DOĞRULANMIŞ İPTAL",
        ],
      ]
    : [
        [
          "01",
          "See the permissions you gave.",
          "Connect your wallet and check supported permissions to see which addresses can spend your tokens.",
          "READ FROM THE CHAIN",
        ],
        [
          "02",
          "Understand the permission.",
          "See how many tokens each permission covers. The animation does not move any tokens.",
          "NO FUNDS MOVED",
        ],
        [
          "03",
          "Remove access you no longer need.",
          "Confirm the revocation in your wallet. See the result after the transaction confirms and the allowance is verified as zero.",
          "VERIFIED REVOCATION",
        ],
      ];
  return (
    <section className="field-guide" aria-label={tr ? "İzinlerin anatomisi" : "Permission anatomy"}>
      <div className="guide-heading">
        <span>{tr ? "İZİNLERİN ANATOMİSİ" : "PERMISSION ANATOMY"}</span>
        <span>{tr ? "GÖR. ANLA. KONTROLÜ GERİ AL." : "OBSERVE. UNDERSTAND. TAKE CONTROL."}</span>
      </div>
      <div className="guide-entries">
        {entries.map(([number, title, description, footnote]) => (
          <article key={number}>
            <span className="guide-number">
              {number}
              <i />
            </span>
            <h2>{title}</h2>
            <p>{description}</p>
            <span className="guide-footnote">{footnote}</span>
          </article>
        ))}
      </div>
      <p className="guide-limit">
        {tr
          ? "İzin vermek, token çekildiği anlamına gelmez. PARASITE tüm cüzdan risklerini veya geçmiş izinleri kapsadığını iddia etmez."
          : "An authorization is not evidence of a withdrawal. PARASITE does not claim to cover every wallet risk or historical approval."}
      </p>
    </section>
  );
}
