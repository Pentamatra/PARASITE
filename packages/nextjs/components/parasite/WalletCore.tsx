import { useLocale } from "./LocaleProvider";

export function WalletCore({ infected = false }: { infected?: boolean }) {
  const { t } = useLocale();
  return (
    <div className={`wallet-core ${infected ? "infected" : ""}`} aria-label={t("Living wallet visualization")}>
      <svg className="core-membrane" viewBox="0 0 240 240" fill="none" aria-hidden="true">
        <path
          d="M120 16C156 5 180 43 199 64S232 106 215 134S210 184 179 201S132 233 103 216S48 214 33 181S3 135 23 105S25 53 62 41S96 22 120 16Z"
          stroke="currentColor"
          strokeOpacity=".42"
        />
        <path
          d="M120 29C151 18 171 52 189 70S219 107 202 134S199 173 172 188S132 216 105 202S57 201 44 174S18 135 36 108S38 65 69 54S99 35 120 29Z"
          stroke="currentColor"
          strokeOpacity=".2"
          strokeDasharray="2 5"
        />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <g key={i} transform={`rotate(${i * 60} 120 120)`}>
            <path d="M120 120Q152 82 119 18M120 120Q87 83 54 54" stroke="currentColor" strokeOpacity=".13" />
            <circle cx="119" cy="18" r="3" fill="currentColor" fillOpacity=".55" />
          </g>
        ))}
      </svg>
      <div className="core-orbit orbit-one" />
      <div className="core-orbit orbit-two" />
      <div className="core-body">
        <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <g className="core-anatomy" stroke="currentColor">
            <circle cx="50" cy="50" r="38" fill="currentColor" fillOpacity=".025" strokeOpacity=".65" />
            <ellipse cx="50" cy="50" rx="19" ry="38" strokeOpacity=".4" />
            <ellipse cx="50" cy="50" rx="33" ry="38" strokeOpacity=".2" />
            {[31, 40, 50, 60, 69].map((y, i) => (
              <ellipse key={y} cx="50" cy={y} rx={i === 0 || i === 4 ? 30 : 37} ry="7" strokeOpacity=".22" />
            ))}
            <path
              d="M23 25 39 37 50 20 66 38 78 26M16 51 34 61 28 78M84 51 66 61 72 78M34 61 50 80 66 61"
              strokeOpacity=".65"
            />
            {[
              [23, 25],
              [39, 37],
              [66, 38],
              [78, 26],
              [34, 61],
              [66, 61],
              [50, 80],
            ].map(([x, y]) => (
              <circle key={`${x}:${y}`} cx={x} cy={y} r="1.5" fill="currentColor" />
            ))}
          </g>
          <g className="core-heart">
            <path d="M25 35 50 20 75 35v30L50 80 25 65Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="m25 35 25 15 25-15M50 50v30M37 28l26 44M63 28 37 72" stroke="currentColor" opacity=".4" />
            <circle cx="50" cy="50" r="10" fill="currentColor" fillOpacity=".15" />
            <circle cx="50" cy="50" r="4" fill="currentColor" />
          </g>
        </svg>
      </div>
      <span className="core-caption">{t("WALLET NUCLEUS")}</span>
    </div>
  );
}
