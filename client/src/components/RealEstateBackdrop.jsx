// client/src/components/RealEstateBackdrop.jsx
// Decorative real-estate line art (skyline, crane, blueprint dimension lines)
// for the cream dashboard background. Inline SVG only, thin forest-green
// strokes at very low opacity, fixed to the bottom of the viewport.
// Purely decorative: aria-hidden, pointer-events none. To remove it, delete
// the <RealEstateBackdrop /> line in pages/Dashboard.jsx.

// [x, width, height] of each building, ground line at y = 290.
const BUILDINGS = [
  [0, 60, 150], [70, 90, 210], [175, 55, 120], [245, 110, 250], [370, 70, 170],
  [455, 90, 120], [610, 80, 230], [705, 60, 150], [780, 120, 270], [915, 70, 190],
  [1000, 95, 140], [1110, 80, 240], [1205, 60, 160], [1280, 100, 205], [1395, 45, 110],
];
const GROUND = 290;

export default function RealEstateBackdrop({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-0 select-none text-forest ${className}`}
    >
      <svg
        className="h-[170px] w-full opacity-[0.07] sm:h-[230px] lg:h-[300px]"
        viewBox="0 0 1440 300"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          <pattern id="reb-windows" width="14" height="18" patternUnits="userSpaceOnUse">
            <rect x="3.5" y="4" width="7" height="9" strokeWidth="0.9" />
          </pattern>
          <linearGradient id="reb-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <mask id="reb-mask">
            <rect width="1440" height="300" fill="url(#reb-fade)" stroke="none" />
          </mask>
        </defs>

        <g mask="url(#reb-mask)">
          {/* buildings with window grids */}
          {BUILDINGS.map(([x, w, h]) => (
            <g key={x}>
              <rect x={x} y={GROUND - h} width={w} height={h} />
              <rect x={x + 7} y={GROUND - h + 12} width={w - 14} height={h - 40} stroke="none" fill="url(#reb-windows)" />
              <path d={`M${x + w / 2 - 7} ${GROUND} v-18 h14 v18`} />
            </g>
          ))}

          {/* roof details: antenna, stepped crown, water tank */}
          <path d="M300 40 V18 M294 40 h12" />
          <path d="M790 20 h100 v-10 h-80 z M820 10 v-8 h40 v8" />
          <path d="M1130 50 h40 v-14 h-40 z M1150 36 v-12" />
          <path d="M80 80 l35 -22 l35 22" />

          {/* tower crane over the site at 545-610 */}
          <path d="M575 290 V48 M587 290 V48" />
          <path d="M575 290 L587 270 L575 250 L587 230 L575 210 L587 190 L575 170 L587 150 L575 130 L587 110 L575 90 L587 70 L575 48" strokeWidth="0.8" />
          <path d="M500 48 H760 M520 36 H760 M581 48 V22 L520 36 M581 22 L760 36" />
          <path d="M500 48 v14 h28 v-14" />
          <path d="M700 48 V140 M694 140 h12 l-6 9 z" />

          {/* blueprint dimension lines */}
          <g strokeWidth="0.8" strokeDasharray="3 4">
            <path d="M245 26 V12 M355 26 V12 M245 19 H355" />
            <path d="M1110 34 V20 M1190 34 V20 M1110 27 H1190" />
            <path d="M1430 180 H1446" />
          </g>
          <path d="M245 19 l6 -3 v6 z M355 19 l-6 -3 v6 z" strokeWidth="0.8" />

          {/* trees */}
          {[165, 365, 600, 905, 1200, 1390].map((x) => (
            <g key={`t${x}`}>
              <circle cx={x} cy={GROUND - 18} r="9" />
              <path d={`M${x} ${GROUND} v-9`} />
            </g>
          ))}

          {/* ground */}
          <path d={`M0 ${GROUND} H1440`} strokeWidth="1.4" />
          <path d={`M0 ${GROUND + 6} H1440`} strokeWidth="0.8" strokeDasharray="10 8" />
        </g>
      </svg>
    </div>
  );
}
