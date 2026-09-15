"use client";

import { useEffect, useState } from "react";
import { IndiaMap, CHOROPLETH_RAMP, type MapDatum, type Arc } from "./IndiaMap";
import { Bars } from "./Bars";

type Detail = Awaited<ReturnType<typeof fetchDetail>>;

async function fetchDetail(state: string, district: string) {
  const res = await fetch(`/api/district?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
  return res.json();
}

const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi", or: "Odia", bn: "Bengali", as: "Assamese", en: "English",
};

export function DashboardView({
  data,
  suppressedKeys,
  suppressedCount,
  suppressedTotal,
  arcs,
  k,
}: {
  data: MapDatum[];
  suppressedKeys: string[];
  suppressedCount: number;
  suppressedTotal: number;
  arcs: Arc[];
  k: number;
}) {
  const [selected, setSelected] = useState<{ state: string; district: string } | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"presence" | "corridors">("presence");

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let live = true;
    setLoading(true);
    void fetchDetail(selected.state, selected.district).then((d) => {
      if (live) {
        setDetail(d);
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [selected]);

  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,1fr)]">
      {/* map */}
      <div>
        {/* Two questions, two views. Drawn together, the corridor arcs land on
            exactly the dense districts and hide the thing they explain. */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">
            {mode === "presence" ? "Where workers are today" : "How they moved to get there"}
          </h2>
          <div className="flex border border-rule" role="group" aria-label="Map view">
            {([
              ["presence", "Presence"],
              ["corridors", "Corridors"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`px-3 py-1 text-xs ${
                  mode === value ? "bg-indigo text-white" : "bg-paper-raised text-ink-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-rule bg-paper-raised p-2">
          <IndiaMap
            data={mode === "presence" ? data : []}
            suppressed={mode === "presence" ? suppressedKeys : []}
            arcs={mode === "corridors" ? arcs : undefined}
            selected={selected ? `${selected.state}|${selected.district}` : null}
            onSelect={setSelected}
          />
        </div>

        {/* legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
          {mode === "presence" && (
          <>
          <div className="flex items-center gap-2">
            <span className="text-ink-faint">Fewer</span>
            <span className="flex">
              {CHOROPLETH_RAMP.map((c) => (
                <span key={c} className="size-4" style={{ background: c }} />
              ))}
            </span>
            <span className="text-ink-faint">More workers</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" aria-hidden>
              <rect width="16" height="16" fill="#f2f4f0" />
              <g stroke="#6b6a80" strokeWidth="1.4">
                <line x1="-4" y1="4" x2="4" y2="-4" />
                <line x1="0" y1="16" x2="16" y2="0" />
                <line x1="8" y1="20" x2="20" y2="8" />
              </g>
            </svg>
            <span>Withheld (under {k})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-4 border border-rule" style={{ background: "#f2f4f0" }} />
            <span>No workers recorded</span>
          </div>
          </>
          )}
          {mode === "corridors" && (
            <div className="flex items-center gap-2">
              <svg width="30" height="12" aria-hidden>
                <path d="M1,9 Q14,0 27,6" fill="none" stroke="#a4630c" strokeWidth="3" strokeOpacity="0.75" strokeLinecap="round" />
              </svg>
              <span>Thicker means more workers moved along that corridor</span>
            </div>
          )}
        </div>

        {mode === "presence" && (
        <p className="mt-3 border-l-2 border-withheld pl-3 text-xs leading-relaxed text-ink-muted">
          <span className="num font-medium">{suppressedCount}</span> districts are withheld from
          this view, covering <span className="num font-medium">{suppressedTotal}</span> workers.
          Each holds fewer than <span className="num">{k}</span> people, where a map would
          effectively name them. You are seeing every district where an aggregate is safe to
          publish, and nothing else.
        </p>
        )}
      </div>

      {/* side panel */}
      <aside>
        {!selected && (
          <div className="border border-rule bg-paper-raised p-5">
            <h2 className="text-sm font-semibold">Top migration corridors</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Interstate moves detected in the last twelve months, from presence
              attestations rather than survey recall.
            </p>
            <div className="mt-4">
              <Bars
                rows={arcs.slice(0, 8).map((a) => ({
                  label: `${a.fromState} to ${a.toState}`,
                  value: a.count,
                }))}
              />
            </div>
            <p className="mt-5 border-t border-rule-soft pt-3 text-xs text-ink-faint">
              Select any district on the map for its composition.
            </p>
          </div>
        )}

        {selected && (
          <div className="border border-rule bg-paper-raised">
            <div className="flex items-start justify-between gap-3 border-b border-rule-soft px-5 py-3">
              <div>
                <h2 className="font-semibold leading-tight">{selected.district}</h2>
                <p className="text-xs text-ink-faint">{selected.state}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="shrink-0 text-xs text-ink-muted underline underline-offset-2"
              >
                Close
              </button>
            </div>

            {loading && <p className="px-5 py-6 text-sm text-ink-faint">Loading…</p>}

            {!loading && detail?.suppressed && (
              <div className="px-5 py-6">
                <p className="text-sm font-medium">Withheld</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  Fewer than {detail.k} workers are present here. Publishing a breakdown would
                  identify them, so no figures are released for this district.
                </p>
              </div>
            )}

            {!loading && detail && !detail.suppressed && (
              <div className="space-y-5 px-5 py-5">
                <dl className="space-y-2 text-sm">
                  <div className="leader">
                    <dt className="text-ink-muted">Workers present</dt>
                    <dd className="num font-semibold">{detail.present.toLocaleString("en-IN")}</dd>
                  </div>
                  <div className="leader">
                    <dt className="text-ink-muted">From another state</dt>
                    <dd className="num font-semibold">{detail.nonDomiciled.toLocaleString("en-IN")}</dd>
                  </div>
                  <div className="leader">
                    <dt className="text-ink-muted">Women</dt>
                    <dd className="num">{detail.women.toLocaleString("en-IN")}</dd>
                  </div>
                </dl>

                <section>
                  <h3 className="text-xs font-semibold">Languages needed for an alert</h3>
                  <div className="mt-2.5">
                    <Bars
                      rows={detail.languages.map((l: { key: string; count: number }) => ({
                        label: LANGUAGE_NAMES[l.key] ?? l.key,
                        value: l.count,
                      }))}
                      accent="#325892"
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold">Reachable in a crisis</h3>
                  <dl className="mt-2 space-y-1.5 text-sm">
                    <div className="leader">
                      <dt className="text-ink-muted">By app notification</dt>
                      <dd className="num">{detail.reachableByPush}</dd>
                    </div>
                    <div className="leader">
                      <dt className="text-ink-muted">By SMS only, no smartphone</dt>
                      <dd className="num">{detail.reachableBySmsOnly}</dd>
                    </div>
                    <div className="leader">
                      <dt className="text-ink-muted">Consent withdrawn, will not be contacted</dt>
                      <dd className="num text-withheld">{detail.consentWithheld}</dd>
                    </div>
                  </dl>
                </section>

                {detail.originStates.visible.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold">Where they came from</h3>
                    <div className="mt-2.5">
                      <Bars
                        rows={detail.originStates.visible.map((o: { state: string; count: number }) => ({
                          label: o.state,
                          value: o.count,
                        }))}
                        accent="#7398cf"
                      />
                    </div>
                    {detail.originStates.suppressedCells > 0 && (
                      <p className="mt-2 text-xs text-ink-faint">
                        {detail.originStates.suppressedCells} origin states withheld, covering{" "}
                        {detail.originStates.suppressedTotal} workers.
                      </p>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
