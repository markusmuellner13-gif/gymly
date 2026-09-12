import type { ReactNode } from "react";
import { MUSCLE_LABEL, titleCase } from "@/lib/exercises";

/**
 * A front/back body diagram with the trained muscles lit up.
 *
 * The catalog names seventeen muscles; each one owns a shape in the front view,
 * the back view or both. Only the muscles a movement actually trains are drawn,
 * so overlapping regions (quads and adductors, lats and mid back) never paint
 * over each other's highlight.
 *
 * Everything is laid out in one 100 x 200 box: head at the top, feet at 196,
 * centre line at x = 50. Limb shapes overlap the torso deliberately so the
 * figure reads as one body rather than a pile of boxes.
 */

type View = "front" | "back";

/** Mirrors a shape across the centre line so limbs stay symmetrical. */
const both = (shape: (side: 1 | -1) => ReactNode) => (
  <>
    {shape(1)}
    {shape(-1)}
  </>
);

/** The plain body the highlights are painted on. */
function Silhouette() {
  return (
    <g fill="var(--surface-3)">
      <ellipse cx="50" cy="17" rx="11" ry="12.5" />
      <rect x="44" y="25" width="12" height="14" rx="4" />
      {/* Ribcage down to the waist, then the pelvis. */}
      <path d="M33 43 Q33 35 50 35 Q67 35 67 43 L63 83 Q63 89 61 95 L39 95 Q37 89 37 83 Z" />
      <path d="M37 92 L63 92 L65 108 Q65 120 50 120 Q35 120 35 108 Z" />
      {both((s) => (
        <g key={s}>
          <circle cx={50 + s * 19} cy="45" r="10" />
          {/* Arms hang clear of the ribcage so the figure reads as a body. */}
          <rect x={s > 0 ? 70 : 17} y="44" width="13" height="36" rx="6.5" />
          <rect x={s > 0 ? 73 : 15} y="76" width="12" height="34" rx="6" />
          <ellipse cx={50 + s * 29} cy="114" rx="5.5" ry="6.5" />
          <rect x={s > 0 ? 51 : 34} y="112" width="15" height="48" rx="7.5" />
          <rect x={s > 0 ? 52 : 36} y="156" width="12" height="40" rx="6" />
          <ellipse cx={50 + s * 8} cy="195" rx="6.5" ry="4" />
        </g>
      ))}
    </g>
  );
}

const NECK = <rect x="44" y="25" width="12" height="14" rx="4" />;
const DELTOIDS = both((s) => <circle key={s} cx={50 + s * 19} cy="45" r="9.5" />);
const UPPER_ARMS = both((s) => (
  <rect key={s} x={s > 0 ? 71 : 18} y="48" width="11" height="27" rx="5.5" />
));
const FOREARMS = both((s) => (
  <rect key={s} x={s > 0 ? 74 : 16} y="78" width="10" height="29" rx="5" />
));

const SHAPES: Record<View, Record<string, ReactNode>> = {
  front: {
    neck: NECK,
    traps: both((s) => (
      <path
        key={s}
        d={`M${50 + s * 14} 44 L${50 + s * 3} 36 L${50 + s * 3} 42 L${50 + s * 15} 49 Z`}
      />
    )),
    shoulders: DELTOIDS,
    chest: both((s) => (
      <rect key={s} x={s > 0 ? 51 : 35} y="42" width="14" height="17" rx="5.5" />
    )),
    biceps: UPPER_ARMS,
    forearms: FOREARMS,
    abdominals: <rect x="40" y="61" width="20" height="32" rx="6" />,
    abductors: both((s) => <ellipse key={s} cx={50 + s * 13} cy="106" rx="5.5" ry="8" />),
    adductors: both((s) => (
      <rect key={s} x={s > 0 ? 51 : 42.5} y="114" width="6.5" height="24" rx="3" />
    )),
    quadriceps: both((s) => (
      <rect key={s} x={s > 0 ? 51.5 : 34.5} y="114" width="14" height="42" rx="7" />
    )),
  },
  back: {
    neck: NECK,
    traps: <path d="M50 31 L35 45 L41 60 L50 64 L59 60 L65 45 Z" />,
    shoulders: DELTOIDS,
    triceps: UPPER_ARMS,
    forearms: FOREARMS,
    lats: both((s) => (
      <path
        key={s}
        d={`M${50 + s * 15} 50 L${50 + s * 3} 60 L${50 + s * 3} 80 L${50 + s * 13} 74 Z`}
      />
    )),
    "middle back": <rect x="42" y="56" width="16" height="22" rx="5" />,
    "lower back": <rect x="40" y="79" width="20" height="18" rx="5" />,
    glutes: both((s) => <ellipse key={s} cx={50 + s * 7} cy="104" rx="8.5" ry="8" />),
    hamstrings: both((s) => (
      <rect key={s} x={s > 0 ? 51.5 : 34.5} y="116" width="14" height="40" rx="7" />
    )),
    calves: both((s) => <ellipse key={s} cx={50 + s * 8} cy="172" rx="6" ry="13" />),
  },
};

function Body({
  view,
  primary,
  secondary,
}: {
  view: View;
  primary: string[];
  secondary: string[];
}) {
  const shapes = SHAPES[view];
  // Secondary first, so a muscle worked both ways ends up lit as primary.
  const layers = [
    { muscles: secondary, opacity: 0.36 },
    { muscles: primary, opacity: 1 },
  ];

  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 100 200"
        className="h-44 w-auto"
        role="img"
        aria-label={`${view === "front" ? "Front" : "Back"} view of the body with the trained muscles highlighted`}
      >
        <Silhouette />
        {layers.map((layer, i) => (
          <g key={i} fill="var(--accent)" opacity={layer.opacity}>
            {layer.muscles.map((m) => (shapes[m] ? <g key={m}>{shapes[m]}</g> : null))}
          </g>
        ))}
      </svg>
      <figcaption className="text-[11px] font-medium text-faint">
        {view === "front" ? "Front" : "Back"}
      </figcaption>
    </figure>
  );
}

export function MuscleMap({
  primary,
  secondary = [],
}: {
  primary: string[];
  secondary?: string[];
}) {
  const label = (m: string) => MUSCLE_LABEL[m] ?? titleCase(m);

  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-3">
      <div className="flex items-start justify-center gap-5">
        <Body view="front" primary={primary} secondary={secondary} />
        <Body view="back" primary={primary} secondary={secondary} />
      </div>

      <div className="mt-2 flex flex-col gap-1 border-t border-line pt-2.5 text-[12px]">
        <p className="flex items-start gap-2">
          <span
            aria-hidden
            className="mt-1 size-2.5 shrink-0 rounded-full"
            style={{ background: "var(--accent)" }}
          />
          <span>
            <span className="text-faint">Trains </span>
            <span className="font-semibold">{primary.map(label).join(", ")}</span>
          </span>
        </p>
        {secondary.length ? (
          <p className="flex items-start gap-2">
            <span
              aria-hidden
              className="mt-1 size-2.5 shrink-0 rounded-full"
              style={{ background: "var(--accent)", opacity: 0.36 }}
            />
            <span>
              <span className="text-faint">Also works </span>
              <span className="font-medium text-muted">{secondary.map(label).join(", ")}</span>
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
