"use client";

import { useMemo, useState } from "react";
import { geoMercator, geoPath, geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import districtsTopo from "@/data/districts.topo.json";
import statesTopo from "@/data/states.topo.json";
import type { FeatureCollection, Feature, Geometry } from "geojson";

// ---------------------------------------------------------------- geometry
// Computed once at module scope: the geography never changes, only the data
// painted onto it.

type DistrictProps = { district: string; st_nm: string; dt_code: string; st_code: string };
type StateProps = { st_nm: string; st_code: string };

const W = 620;
const H = 680;

const districts = feature(
  districtsTopo as never,
  (districtsTopo as never as { objects: { districts: unknown } }).objects.districts as never,
) as unknown as FeatureCollection<Geometry, DistrictProps>;

const states = feature(
  statesTopo as never,
  (statesTopo as never as { objects: { states: unknown } }).objects.states as never,
) as unknown as FeatureCollection<Geometry, StateProps>;

const projection = geoMercator().fitExtent(
  [
    [8, 8],
    [W - 8, H - 8],
  ],
  districts,
);

// Fixed output precision for the same reason — see the arc note below.
const path = geoPath(projection).digits(2);

// The source boundary set carries 34 unnamed state-sized "remainder" polygons
// alongside the 726 real districts. They sort last, so they paint over every
// district beneath them and flatten the whole choropleth to one colour.
const namedDistricts = districts.features.filter((f) => Boolean(f.properties.district));

const districtPaths = namedDistricts.map((f, i) => ({
  // Some union territories are stored as several polygons under one name, so
  // the render key carries the index while the data key does not.
  id: `${f.properties.st_nm}|${f.properties.district}#${i}`,
  key: `${f.properties.st_nm}|${f.properties.district}`,
  state: f.properties.st_nm,
  district: f.properties.district,
  d: path(f) ?? "",
}));

const statePaths = states.features.map((f, i) => ({
  id: `${f.properties.st_nm}#${i}`,
  d: path(f) ?? "",
}));

const stateCentroid = new Map<string, [number, number]>(
  states.features.map((f) => {
    const [lng, lat] = geoCentroid(f as Feature<Geometry, StateProps>);
    const p = projection([lng, lat]);
    return [f.properties.st_nm, (p ?? [0, 0]) as [number, number]];
  }),
);

// --------------------------------------------------------------- colour
// Sequential, single hue, light to dark. Lightness decreases monotonically
// (verified), so the ramp reads as magnitude for every kind of colour vision.
const RAMP = ["#d3e0f2", "#b2c9e6", "#8fb0da", "#6b93c8", "#4a73b0", "#32568e", "#23395b"];

function makeScale(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return () => RAMP[0];
  // quantile breaks, so a handful of very large districts do not flatten the
  // rest of the country into one colour
  const breaks = RAMP.slice(1).map((_, i) => sorted[Math.floor(((i + 1) / RAMP.length) * sorted.length)]);
  return (v: number) => {
    for (let i = 0; i < breaks.length; i++) if (v < breaks[i]) return RAMP[i];
    return RAMP[RAMP.length - 1];
  };
}

export type MapDatum = { state: string; district: string; count: number };
export type Arc = { fromState: string; toState: string; count: number };

export function IndiaMap({
  data,
  suppressed,
  arcs,
  selected,
  onSelect,
}: {
  data: MapDatum[];
  /** district keys withheld by the k-anonymity gate */
  suppressed: string[];
  arcs?: Arc[];
  selected?: string | null;
  onSelect?: (d: { state: string; district: string } | null) => void;
}) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string; sub: string } | null>(null);

  const counts = useMemo(() => new Map(data.map((d) => [`${d.state}|${d.district}`, d.count])), [data]);
  const withheld = useMemo(() => new Set(suppressed), [suppressed]);
  const colour = useMemo(() => makeScale(data.map((d) => d.count)), [data]);

  const arcPaths = useMemo(() => {
    if (!arcs?.length) return [];
    const max = Math.max(...arcs.map((a) => a.count));
    return arcs
      .map((a) => {
        const from = stateCentroid.get(a.fromState);
        const to = stateCentroid.get(a.toState);
        if (!from || !to) return null;
        // quadratic curve bowed perpendicular to the chord, so two-way flows
        // between the same pair do not overlap
        const [x1, y1] = from;
        const [x2, y2] = to;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const cx = mx - (dy / len) * len * 0.18;
        const cy = my + (dx / len) * len * 0.18;
        // Rounded before it reaches the DOM. Node and the browser disagree in
        // the last bits of these projections, which is invisible on screen but
        // is a hydration mismatch as far as React is concerned.
        const r = (n: number) => Math.round(n * 100) / 100;
        return {
          key: `${a.fromState}->${a.toState}`,
          d: `M${r(x1)},${r(y1)} Q${r(cx)},${r(cy)} ${r(x2)},${r(y2)}`,
          width: r(0.8 + (a.count / max) * 4.5),
          opacity: r(0.25 + (a.count / max) * 0.5),
          label: `${a.fromState} to ${a.toState}`,
          count: a.count,
        };
      })
      .filter(Boolean) as { key: string; d: string; width: number; opacity: number; label: string; count: number }[];
  }, [arcs]);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="District map of India showing migrant worker presence"
      >
        <defs>
          {/* Withheld districts are a state, not a magnitude, so they are
              distinguished by texture as well as hue — legible in print,
              in forced colours, and for every kind of colour vision. */}
          <pattern id="withheld" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="#f2f4f0" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="#6b6a80" strokeWidth="1.4" />
          </pattern>
          <marker id="arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,1 L7,4 L0,7 Z" fill="#a4630c" />
          </marker>
        </defs>

        {/* districts */}
        <g>
          {districtPaths.map((p) => {
            const count = counts.get(p.key);
            const isWithheld = withheld.has(p.key);
            const fill = isWithheld ? "url(#withheld)" : count != null ? colour(count) : "#f2f4f0";
            const isSelected = selected === p.key;
            return (
              <path
                key={p.id}
                d={p.d}
                fill={fill}
                stroke={isSelected ? "#1c1a17" : "#d5dbd3"}
                strokeWidth={isSelected ? 1.6 : 0.35}
                className="cursor-pointer"
                onMouseEnter={(e) =>
                  setHover({
                    x: e.nativeEvent.offsetX,
                    y: e.nativeEvent.offsetY,
                    label: `${p.district}, ${p.state}`,
                    sub: isWithheld
                      ? "Withheld — fewer than 10 workers"
                      : count != null
                        ? `${count.toLocaleString("en-IN")} workers present`
                        : "No workers recorded",
                  })
                }
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect?.(isSelected ? null : { state: p.state, district: p.district })}
              />
            );
          })}
        </g>

        {/* state outlines, drawn over the fills so borders stay legible */}
        <g fill="none" stroke="#9aa39a" strokeWidth="0.7" pointerEvents="none">
          {statePaths.map((s) => (
            <path key={s.id} d={s.d} />
          ))}
        </g>

        {/* corridor arcs */}
        {arcPaths.length > 0 && (
          <g fill="none" pointerEvents="none">
            {arcPaths.map((a) => (
              <path
                key={a.key}
                d={a.d}
                stroke="#a4630c"
                strokeWidth={a.width}
                strokeOpacity={a.opacity}
                strokeLinecap="round"
                markerEnd="url(#arrow)"
              />
            ))}
          </g>
        )}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 max-w-[14rem] border border-rule bg-paper-raised px-2.5 py-1.5 text-xs shadow-sm"
          style={{ left: Math.min(hover.x + 12, 420), top: hover.y + 12 }}
        >
          <p className="font-medium">{hover.label}</p>
          <p className="mt-0.5 text-ink-muted">{hover.sub}</p>
        </div>
      )}
    </div>
  );
}

export const CHOROPLETH_RAMP = RAMP;
