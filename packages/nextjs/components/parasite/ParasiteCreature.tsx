import { useId } from "react";

export function ParasiteCreature({ seed, tone = "pink" }: { seed: string; tone?: string }) {
  const id = useId().replaceAll(":", "");
  let hash = 2166136261;
  for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  const sentinel = tone === "pink";
  const shell = `shell-${id}`,
    light = `light-${id}`;
  return (
    <svg
      className={`creature creature-${tone} organism-detailed ${sentinel ? "organism-sentinel" : "organism-ember"}`}
      viewBox="0 0 180 180"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={shell} cx="36%" cy="26%" r="80%">
          <stop stopColor="white" stopOpacity=".55" />
          <stop offset=".24" stopColor="currentColor" stopOpacity=".85" />
          <stop offset=".68" stopColor="currentColor" stopOpacity=".25" />
          <stop offset="1" stopColor="#0b0918" />
        </radialGradient>
        <radialGradient id={light}>
          <stop stopColor="white" />
          <stop offset=".3" stopColor="white" stopOpacity=".9" />
          <stop offset=".6" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="90" cy="96" rx="57" ry="62" fill={`url(#${light})`} opacity=".1" />
      {sentinel ? (
        <>
          {[-1, 1].map(side => (
            <g key={side} transform={side === -1 ? "translate(180 0) scale(-1 1)" : undefined}>
              {[0, 1, 2, 3].map(i => (
                <g key={i} className="organism-leg" style={{ animationDelay: `${-i * 0.65}s` }}>
                  <path
                    d={`M${108 - i * 2} ${59 + i * 15} Q${133 + i * 2} ${40 + i * 14} ${147 - i * 3} ${24 + i * 25} L${163 - i * 2} ${43 + i * 23} L${150 - i * 5} ${59 + i * 25}`}
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                  <path
                    d={`M${108 - i * 2} ${59 + i * 15} Q${133 + i * 2} ${40 + i * 14} ${147 - i * 3} ${24 + i * 25}`}
                    stroke="currentColor"
                    strokeWidth="7"
                    opacity=".12"
                  />
                  <circle cx={147 - i * 3} cy={24 + i * 25} r="3" fill={`url(#${shell})`} stroke="currentColor" />
                </g>
              ))}
            </g>
          ))}
          <path
            d="M90 27 111 48 122 80 115 113 101 139 90 155 79 139 65 113 58 80 69 48Z"
            fill={`url(#${shell})`}
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {[48, 63, 111, 127, 139].map((y, i) => (
            <path
              key={y}
              d={`M${i < 2 ? 71 : 72 + i} ${y} Q90 ${y + 11} ${i < 2 ? 109 : 108 - i} ${y}`}
              stroke="currentColor"
              strokeOpacity=".65"
              strokeWidth="1.4"
            />
          ))}
          <path
            d="M76 46 70 23 83 38M104 46 110 23 97 38M70 78 57 73 66 91M110 78 123 73 114 91"
            fill={`url(#${shell})`}
            stroke="currentColor"
          />
          <path d="M84 134 77 155 86 147M96 134 103 155 94 147" stroke="currentColor" />
        </>
      ) : (
        <>
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i} transform={`rotate(${(i * 360) / 7 + (hash % 14)} 90 85)`}>
              <path
                className="organism-frond"
                d="M83 65C44 58 36 33 55 22C74 12 74 43 93 49C111 56 113 69 98 77"
                fill={`url(#${shell})`}
                fillOpacity=".65"
                stroke="currentColor"
                strokeWidth=".9"
                style={{ animationDelay: `${-i * 0.4}s` }}
              />
              <path d="M87 64Q48 38 56 24" stroke="currentColor" strokeOpacity=".5" />
            </g>
          ))}
          <path
            d="M90 46C114 47 127 68 120 91L105 117 90 130 75 117 60 91C53 68 66 47 90 46Z"
            fill={`url(#${shell})`}
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <g className="organism-tail" stroke="currentColor">
            <path d="M76 110Q57 135 78 160M90 119Q105 145 88 170M103 110Q127 135 106 158" strokeWidth="1.4" />
            <path d="M80 112Q65 139 81 154M98 115Q113 140 103 152" strokeOpacity=".4" />
          </g>
        </>
      )}
      <g className="organism-reactor">
        <ellipse cx="90" cy="84" rx="25" ry="27" fill="#090814" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="90" cy="84" rx="20" ry="22" fill={`url(#${shell})`} />
        <circle cx="90" cy="84" r="17" stroke="currentColor" strokeDasharray="1 4" opacity=".8" />
        <path d="M73 84Q90 63 107 84Q90 105 73 84Z" fill={`url(#${light})`} />
        <ellipse cx="90" cy="84" rx="4" ry="12" fill="#10091a" />
        <circle cx="95" cy="78" r="2.7" fill="white" />
      </g>
      <path d="M76 51Q91 44 103 55" stroke="white" strokeOpacity=".6" strokeLinecap="round" />
      {[0, 1, 2, 3].map(i => (
        <circle
          key={i}
          className="organism-spore"
          cx={28 + ((hash >>> (i * 4)) % 124)}
          cy={23 + i * 39}
          r={1 + (i % 2) * 0.7}
          fill="currentColor"
          style={{ animationDelay: `${-i * 0.7}s` }}
        />
      ))}
    </svg>
  );
}
