import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Brush,
    ReferenceArea,
} from 'recharts';

// ---------------- Types ----------------
export type RangeKey = '7d' | '30d' | 'custom';
export type Granularity = 'hour' | 'day' | 'week';
export type SplitMode = 'combined' | 'byMachine' | 'byFabric';

export interface Filters {
    start?: string; // yyyy-mm-dd (inclusive)
    end?: string; // yyyy-mm-dd (inclusive in UI; request sends end+1 day)
    machine_id?: string;
    fabric_id?: string;
    sort?: 'asc' | 'desc';
}
export interface StatsProps {
    title?: string;
    apiBase?: string;
    initialFilters?: Filters;
    initialRange?: RangeKey;
    initialGranularity?: Granularity;
    initialSplit?: SplitMode;
    machineOptions?: Array<{ value: string; label: string }>;
    fabricOptions?: Array<{ value: string; label: string }>;
    xKey?: string; // e.g. 'time'
    yKey?: string; // e.g. 'total_meter'
    machineKey?: string; // e.g. 'machine_id'
    fabricKey?: string; // e.g. 'fabric_id'
}

export default function StatsSectionDarkSplitV9({
    title = 'Statistics',
    apiBase,
    initialFilters,
    initialRange = '7d',
    initialGranularity = 'day',
    initialSplit = 'combined',
    machineOptions = [],
    fabricOptions = [],
    xKey: xKeyProp,
    yKey: yKeyProp,
    machineKey: machineKeyProp,
    fabricKey: fabricKeyProp,
}: StatsProps) {
    const resolvedApiBase = useMemo(() => {
        if (apiBase) return apiBase;
        const proto = window.location.protocol;
        return proto === 'file:' || proto === 'http:'
            ? 'http://127.0.0.1:8080'
            : '';
    }, [apiBase]);

    // UI state
    const [range, setRange] = useState<RangeKey>(initialRange);
    const [granularity, setGranularity] =
        useState<Granularity>(initialGranularity);
    const [splitMode, setSplitMode] = useState<SplitMode>(initialSplit);
    const [filters, setFilters] = useState<Filters>(() => ({
        start: initialFilters?.start,
        end: initialFilters?.end,
        machine_id: initialFilters?.machine_id,
        fabric_id: initialFilters?.fabric_id,
        sort: 'asc',
    }));

    // Auto-fill dates from range
    useEffect(() => {
        if (range === 'custom') return;
        const now = new Date();
        const end = toISODate(now);
        const start = new Date(now);
        start.setDate(now.getDate() - (range === '7d' ? 6 : 29));
        setFilters((f) => ({ ...f, start: toISODate(start), end }));
    }, [range]);

    // Data
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<any[]>([]);
    const [lastFetched, setLastFetched] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams();
            if (filters.machine_id)
                params.set('machine_id', filters.machine_id);
            if (filters.fabric_id) params.set('fabric_id', filters.fabric_id);
            if (filters.start) params.set('start', filters.start);
            if (filters.end) params.set('end', addDaysISO(filters.end, 1)); // inclusive UI → exclusive request
            params.set('sort', 'asc');
            params.set('time_format', granularity);

            const resp = await fetch(
                `${resolvedApiBase}/api/demo?${params.toString()}`
            );
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            const allRows = Array.isArray(json?.allRows) ? json.allRows : [];
            setRows(allRows);
            setLastFetched(new Date().toLocaleString());
        } catch (e: any) {
            setError(e?.message || String(e));
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [
        granularity,
        filters.start,
        filters.end,
        filters.machine_id,
        filters.fabric_id,
    ]);

    // Key inference & chart shaping
    const inferred = useMemo(
        () =>
            inferKeys(rows, {
                xKeyProp,
                yKeyProp,
                machineKeyProp,
                fabricKeyProp,
            }),
        [rows, xKeyProp, yKeyProp, machineKeyProp, fabricKeyProp]
    );
    const chart = useMemo(
        () => shapeForChart(rows, inferred, splitMode, granularity),
        [rows, inferred, splitMode, granularity]
    );

    // Label map (e.g., week labels)
    const labelByTs = useMemo(() => {
        const m = new Map<number, string>();
        chart.data.forEach((d: any) => {
            if (d.label && typeof d.xTs === 'number') m.set(d.xTs, d.label);
        });
        return m;
    }, [chart.data]);

    // Global axis domain from filters (inclusive) → chart domain defaults
    const filterDomain = useMemo(
        () => domainFromFilters(filters, chart.data),
        [filters, chart.data]
    );

    // Compute Y min/max across all series for helpers, brush, etc.
    const globalY = useMemo(() => {
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        for (const d of chart.data) {
            for (const s of chart.series) {
                const v = Number(d[s.key]);
                if (Number.isFinite(v)) {
                    if (v < min) min = v;
                    if (v > max) max = v;
                }
            }
        }
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
            min = 0;
            max = 1;
        }
        if (min === max) {
            max = min + 1;
        }
        return { min, max };
    }, [chart.data, chart.series]);

    // ----- Zoom / Pan state -----
    const [xDomain, setXDomain] = useState<[number, number] | null>(null); // timestamps
    const [yDomain, setYDomain] = useState<[number, number] | null>(null);

    // Apply filter domain when filters change (reset zoom)
    useEffect(() => {
        setXDomain([filterDomain.minTs, filterDomain.maxTs]);
        setYDomain(null); // reset to auto based on data each time
    }, [filterDomain.minTs, filterDomain.maxTs, granularity, splitMode]);

    // Brush (X) → control xDomain with index window
    const onBrushChange = (range: any) => {
        if (!chart.data.length) return;
        const startIdx = Math.max(0, range?.startIndex ?? 0);
        const endIdx = Math.min(
            chart.data.length - 1,
            range?.endIndex ?? chart.data.length - 1
        );
        const a = Number(chart.data[startIdx]?.xTs);
        const b = Number(chart.data[endIdx]?.xTs);
        if (Number.isFinite(a) && Number.isFinite(b))
            setXDomain([Math.min(a, b), Math.max(a, b)]);
    };

    // Box-zoom via drag (ReferenceArea) for both axes
    const [refStartTs, setRefStartTs] = useState<number | null>(null);
    const [refEndTs, setRefEndTs] = useState<number | null>(null);

    const calcRefYBounds = (x1: number, x2: number) => {
        let lo = Number.POSITIVE_INFINITY;
        let hi = Number.NEGATIVE_INFINITY;
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        for (const d of chart.data) {
            const t = Number(d.xTs);
            if (!Number.isFinite(t)) continue;
            if (t < minX || t > maxX) continue;
            for (const s of chart.series) {
                const v = Number(d[s.key]);
                if (Number.isFinite(v)) {
                    if (v < lo) lo = v;
                    if (v > hi) hi = v;
                }
            }
        }
        if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) {
            lo = globalY.min;
            hi = globalY.max;
        }
        return [lo, hi] as [number, number];
    };

    const onChartMouseDown = (e: any) => {
        if (e && typeof e.activeLabel === 'number')
            setRefStartTs(e.activeLabel);
    };
    const onChartMouseMove = (e: any) => {
        if (!refStartTs) return;
        if (e && typeof e.activeLabel === 'number') setRefEndTs(e.activeLabel);
    };
    const onChartMouseUp = () => {
        if (refStartTs && refEndTs) {
            const [loY, hiY] = calcRefYBounds(refStartTs, refEndTs);
            setXDomain([
                Math.min(refStartTs, refEndTs),
                Math.max(refStartTs, refEndTs),
            ]);
            setYDomain([loY, hiY]);
        }
        setRefStartTs(null);
        setRefEndTs(null);
    };

    const resetZoom = () => {
        setXDomain([filterDomain.minTs, filterDomain.maxTs]);
        setYDomain(null);
    };

    // Y "scrollbar" (simple window controls)
    const [yMinPct, setYMinPct] = useState(0); // 0..100
    const [yMaxPct, setYMaxPct] = useState(100); // 0..100
    useEffect(() => {
        if (!chart.series.length) return;
        const span = globalY.max - globalY.min;
        const lo = globalY.min + (yMinPct / 100) * span;
        const hi = globalY.min + (yMaxPct / 100) * span;
        if (hi - lo > 0.0001) setYDomain([lo, hi]);
    }, [yMinPct, yMaxPct, globalY.min, globalY.max, chart.series.length]);

    // Ensure yMinPct <= yMaxPct
    const onYMinPct = (v: number) => setYMinPct(Math.min(v, yMaxPct - 1));
    const onYMaxPct = (v: number) => setYMaxPct(Math.max(v, yMinPct + 1));

    // Build ticks for X from domain (always span full selected range)
    const ticks = useMemo(
        () =>
            generateTicks(
                granularity,
                xDomain?.[0] ?? filterDomain.minTs,
                xDomain?.[1] ?? filterDomain.maxTs
            ),
        [granularity, xDomain, filterDomain]
    );

    return (
        <section className="mx-auto max-w-6xl px-4 py-6">
            {/* Filter bar */}
            <div className="sticky top-0 z-10">
                <div className="h-12 rounded-t-xl border border-neutral-800 bg-neutral-900/80 backdrop-blur flex items-center gap-2 px-3">
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-theme-font-one truncate">
                            {title}
                        </div>
                        <div className="text-xs text-theme-font-three truncate">
                            {summaryFrom(filters)} · {capitalize(granularity)}
                        </div>
                    </div>

                    <div className="mx-auto">
                        <Segmented
                            value={range}
                            onChange={(v) => {
                                setRange(v);
                            }}
                        />
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <LabeledDate
                            label="Start"
                            value={filters.start}
                            onChange={(d) => {
                                setFilters((f) => ({ ...f, start: d }));
                                setRange('custom');
                            }}
                        />
                        <LabeledDate
                            label="End"
                            value={filters.end}
                            onChange={(d) => {
                                setFilters((f) => ({ ...f, end: d }));
                                setRange('custom');
                            }}
                        />

                        <SelectCompact
                            label="Granularity"
                            value={granularity}
                            onChange={(v) => setGranularity(v as Granularity)}
                            options={[
                                { value: 'hour', label: 'Hour' },
                                { value: 'day', label: 'Day' },
                                { value: 'week', label: 'Week' },
                            ]}
                        />
                        <SelectCompact
                            label="Split"
                            value={splitMode}
                            onChange={(v) => setSplitMode(v as SplitMode)}
                            options={[
                                { value: 'combined', label: 'Combined' },
                                { value: 'byMachine', label: 'By machine' },
                                { value: 'byFabric', label: 'By fabric' },
                            ]}
                        />
                        <SelectCompact
                            label="Machine"
                            value={filters.machine_id || ''}
                            onChange={(v) =>
                                setFilters((f) => ({
                                    ...f,
                                    machine_id: v || undefined,
                                }))
                            }
                            options={[
                                { value: '', label: 'Any' },
                                ...machineOptions,
                            ]}
                        />
                        <SelectCompact
                            label="Fabric"
                            value={filters.fabric_id || ''}
                            onChange={(v) =>
                                setFilters((f) => ({
                                    ...f,
                                    fabric_id: v || undefined,
                                }))
                            }
                            options={[
                                { value: '', label: 'Any' },
                                ...fabricOptions,
                            ]}
                        />

                        <button
                            className="h-8 px-3 rounded-lg border border-neutral-800 text-sm text-theme-font-two hover:bg-neutral-800"
                            onClick={resetZoom}
                        >
                            Reset zoom
                        </button>
                    </div>
                </div>
            </div>

            {/* Chart + Y controls */}
            <div className="rounded-b-xl border border-neutral-800 p-4 bg-neutral-900/60">
                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-theme-font-one">
                                {chart.title}
                            </h3>
                            <span className="text-xs text-theme-font-three">
                                {lastFetched ? `Updated ${lastFetched}` : '—'}
                            </span>
                        </div>

                        <div className="h-80 rounded-md border border-neutral-800 bg-neutral-950">
                            {error ? (
                                <div className="w-full h-full flex items-center justify-center text-theme-font-three text-sm">
                                    {error}
                                </div>
                            ) : chart.series.length === 0 ? (
                                <div className="w-full h-full flex items-center justify-center text-theme-font-three text-sm px-6 text-center">
                                    No plottable fields detected. Pass explicit
                                    keys via props if needed (xKey/yKey,
                                    optional machineKey/fabricKey).
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={chart.data}
                                        margin={{
                                            top: 16,
                                            right: 24,
                                            bottom: 8,
                                            left: 0,
                                        }}
                                        onMouseDown={onChartMouseDown}
                                        onMouseMove={onChartMouseMove}
                                        onMouseUp={onChartMouseUp}
                                    >
                                        <CartesianGrid
                                            strokeOpacity={0.2}
                                            stroke="#27272a"
                                        />
                                        <XAxis
                                            type="number"
                                            dataKey="xTs"
                                            domain={
                                                xDomain ?? [
                                                    filterDomain.minTs,
                                                    filterDomain.maxTs,
                                                ]
                                            }
                                            ticks={ticks}
                                            scale="time"
                                            stroke="#3f3f46"
                                            tickLine={{ stroke: '#3f3f46' }}
                                            axisLine={{ stroke: '#3f3f46' }}
                                            tick={{
                                                fill: 'rgba(255,255,255,0.85)',
                                                fontSize: 12,
                                            }}
                                            tickFormatter={(ts: number) =>
                                                labelByTs.get(ts) ||
                                                formatTickFromTs(
                                                    ts,
                                                    granularity
                                                )
                                            }
                                        />
                                        <YAxis
                                            domain={yDomain ?? ['auto', 'auto']}
                                            stroke="#3f3f46"
                                            tickLine={{ stroke: '#3f3f46' }}
                                            axisLine={{ stroke: '#3f3f46' }}
                                            tick={{
                                                fill: 'rgba(255,255,255,0.85)',
                                                fontSize: 12,
                                            }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: '#0b0f19',
                                                border: '1px solid #262626',
                                                borderRadius: 8,
                                            }}
                                            labelStyle={{ color: '#e5e7eb' }}
                                            itemStyle={{ color: '#e5e7eb' }}
                                            formatter={(val: any) =>
                                                typeof val === 'number'
                                                    ? val.toFixed(2)
                                                    : String(val)
                                            }
                                            labelFormatter={(ts: any) =>
                                                labelByTs.get(Number(ts)) ||
                                                new Date(
                                                    Number(ts)
                                                ).toLocaleString()
                                            }
                                        />
                                        {chart.series.map((s, i) => (
                                            <Line
                                                key={s.key}
                                                type="monotone"
                                                dataKey={s.key}
                                                name={s.label}
                                                dot={false}
                                                strokeWidth={2}
                                                stroke={
                                                    palette[i % palette.length]
                                                }
                                            />
                                        ))}
                                        {chart.series.length > 1 && (
                                            <Legend
                                                wrapperStyle={{
                                                    color: '#e5e7eb',
                                                }}
                                            />
                                        )}

                                        {/* Box zoom selection */}
                                        {refStartTs !== null &&
                                            refEndTs !== null && (
                                                <ReferenceArea
                                                    x1={Math.min(
                                                        refStartTs,
                                                        refEndTs
                                                    )}
                                                    x2={Math.max(
                                                        refStartTs,
                                                        refEndTs
                                                    )}
                                                    y1={
                                                        yDomain
                                                            ? yDomain[0]
                                                            : undefined
                                                    }
                                                    y2={
                                                        yDomain
                                                            ? yDomain[1]
                                                            : undefined
                                                    }
                                                    strokeOpacity={0.3}
                                                    fill="#60a5fa"
                                                    fillOpacity={0.08}
                                                />
                                            )}

                                        {/* Horizontal Brush for X scroll/zoom */}
                                        <Brush
                                            dataKey="xTs"
                                            height={24}
                                            stroke="#3f3f46"
                                            travellerWidth={8}
                                            tickFormatter={(ts: any) => {
                                                const n = Number(ts);
                                                return (
                                                    labelByTs.get(n) ||
                                                    shortTick(new Date(n))
                                                );
                                            }}
                                            onChange={onBrushChange}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="mt-3 text-xs text-theme-font-three flex items-center gap-3">
                            <span>Rows: {rows.length}</span>
                            <span>
                                Keys → time:{' '}
                                <code className="text-theme-font-two">
                                    {inferred.timeKey || '—'}
                                </code>
                                , meters:{' '}
                                <code className="text-theme-font-two">
                                    {inferred.meterKey || '—'}
                                </code>
                                , machine:{' '}
                                <code className="text-theme-font-two">
                                    {inferred.machineKey || '—'}
                                </code>
                                , fabric:{' '}
                                <code className="text-theme-font-two">
                                    {inferred.fabricKey || '—'}
                                </code>
                            </span>
                        </div>
                    </div>

                    {/* Y-axis scrollbar / window controls */}
                    <div className="w-28 shrink-0 border border-neutral-800 rounded-md p-2 bg-neutral-900/60">
                        <div className="text-xs text-theme-font-three mb-2">
                            Y window
                        </div>
                        <div className="text-[11px] text-theme-font-three mb-1">
                            Min ({globalY.min.toFixed(2)})
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={99}
                            step={1}
                            value={yMinPct}
                            onChange={(e) => onYMinPct(Number(e.target.value))}
                            className="w-full"
                        />
                        <div className="text-[11px] text-theme-font-three mt-2 mb-1">
                            Max ({globalY.max.toFixed(2)})
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={100}
                            step={1}
                            value={yMaxPct}
                            onChange={(e) => onYMaxPct(Number(e.target.value))}
                            className="w-full"
                        />
                        <button
                            className="mt-3 w-full h-8 text-sm rounded-md border border-neutral-800 text-theme-font-two hover:bg-neutral-800"
                            onClick={() => {
                                setYMinPct(0);
                                setYMaxPct(100);
                                setYDomain(null);
                            }}
                        >
                            Reset Y
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

// --------------- UI bits ---------------
function Segmented({
    value,
    onChange,
}: {
    value: RangeKey;
    onChange: (v: RangeKey) => void;
}) {
    const Btn = ({
        v,
        label,
        first,
        last,
    }: {
        v: RangeKey;
        label: string;
        first?: boolean;
        last?: boolean;
    }) => (
        <button
            type="button"
            onClick={() => onChange(v)}
            className={[
                'px-3 h-8 text-sm border border-neutral-800',
                first ? 'rounded-l-lg' : '',
                last ? 'rounded-r-lg' : '',
                v === value
                    ? 'bg-white text-black'
                    : 'text-theme-font-two hover:bg-neutral-800',
            ].join(' ')}
            aria-pressed={v === value}
        >
            {label}
        </button>
    );

    return (
        <div className="inline-flex items-center rounded-lg overflow-hidden border border-neutral-800">
            <Btn v="7d" label="7d" first />
            <Btn v="30d" label="30d" />
            <Btn v="custom" label="Custom" last />
        </div>
    );
}

function LabeledDate({
    label,
    value,
    onChange,
}: {
    label: string;
    value?: string;
    onChange: (v?: string) => void;
}) {
    return (
        <label className="inline-flex items-center gap-2 text-xs text-theme-font-three">
            <span>{label}</span>
            <input
                type="date"
                className="h-8 px-2 rounded-lg border border-neutral-800 bg-neutral-900 text-theme-font-one text-sm"
                value={value || ''}
                onChange={(e) => onChange(e.target.value || undefined)}
            />
        </label>
    );
}

function SelectCompact({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
}) {
    const [open, setOpen] = useState(false);
    const ref = useClickAway(() => setOpen(false));
    const display = options.find((o) => o.value === value)?.label ?? label;
    return (
        <div className="relative" ref={ref as any}>
            <button
                className="h-8 px-3 rounded-lg border border-neutral-800 text-sm text-theme-font-two hover:bg-neutral-800"
                onClick={() => setOpen((o) => !o)}
            >
                {display}
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl p-1 z-20">
                    {options.map((o) => (
                        <button
                            key={o.value}
                            className={`w-full text-left px-3 h-8 rounded-md text-sm ${
                                o.value === value
                                    ? 'bg-white/10 text-theme-font-one'
                                    : 'text-theme-font-two hover:bg-neutral-800'
                            }`}
                            onClick={() => {
                                onChange(o.value);
                                setOpen(false);
                            }}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function useClickAway(handler: () => void) {
    const ref = useRef<HTMLElement | null>(null);
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            const el = ref.current;
            if (!el) return;
            if (e.target instanceof Node && !el.contains(e.target)) handler();
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [handler]);
    return ref;
}

// --------------- Data shaping ---------------
const palette = [
    '#60a5fa',
    '#34d399',
    '#f472b6',
    '#f59e0b',
    '#a78bfa',
    '#22d3ee',
    '#fb7185',
    '#10b981',
    '#f97316',
    '#c084fc',
];

function inferKeys(
    rows: any[],
    propsKeys: {
        xKeyProp?: string;
        yKeyProp?: string;
        machineKeyProp?: string;
        fabricKeyProp?: string;
    }
) {
    if (
        propsKeys.xKeyProp ||
        propsKeys.yKeyProp ||
        propsKeys.machineKeyProp ||
        propsKeys.fabricKeyProp
    ) {
        return {
            timeKey: propsKeys.xKeyProp,
            meterKey: propsKeys.yKeyProp,
            machineKey: propsKeys.machineKeyProp,
            fabricKey: propsKeys.fabricKeyProp,
        };
    }

    const timeCandidates = [
        'timestamp',
        'time',
        'date',
        'bucket',
        'hour',
        'day',
        'ts',
        't',
        'period',
        'start',
        'dt',
        'time_bucket',
        'hour_bucket',
        'day_bucket',
        'week',
        'week_start',
        'weekStart',
        'week_bucket',
        'week_start_date',
        'period_start',
        'yearWeek',
        'iso_week',
        'isoWeek',
    ];
    const meterCandidates = [
        'meters',
        'meter',
        'value',
        'count',
        'total',
        'sum',
        'total_meter',
        'total_meters',
        'meters_sum',
        'meter_idag',
        'meter_total',
    ];
    const machineCandidates = [
        'machine_id',
        'machineId',
        'machine',
        'machine_name',
        'machineName',
        'device_id',
        'device',
        'loom',
        'loom_id',
        'name',
    ];
    const fabricCandidates = [
        'fabric_id',
        'fabricId',
        'fabric',
        'article_number',
        'articleNumber',
        'article',
        'article_no',
        'article_nr',
        'fabricArticle',
        'fabric_name',
    ];

    const pick = (cands: string[], obj: any) => cands.find((k) => k in obj);

    let timeKey: string | undefined;
    let meterKey: string | undefined;
    let machineKey: string | undefined;
    let fabricKey: string | undefined;

    if (rows?.length) {
        const sample = rows[0];
        timeKey = pick(timeCandidates, sample);

        if (!timeKey) {
            for (const k of Object.keys(sample)) {
                const v = sample[k];
                if (
                    v &&
                    typeof v === 'object' &&
                    ('start' in v || 'date' in v)
                ) {
                    timeKey = k;
                    break;
                }
            }
        }

        meterKey = pick(meterCandidates, sample);
        machineKey = pick(machineCandidates, sample);
        fabricKey = pick(fabricCandidates, sample);

        if (!meterKey) {
            const ignored = new Set([timeKey, 'id', 'machine_id', 'fabric_id']);
            for (const k of Object.keys(sample)) {
                if (!ignored.has(k) && typeof sample[k] === 'number') {
                    meterKey = k;
                    break;
                }
            }
        }
    }
    return { timeKey, meterKey, machineKey, fabricKey };
}

function shapeForChart(
    rows: any[],
    keys: ReturnType<typeof inferKeys>,
    split: SplitMode,
    granularity: Granularity
) {
    const title =
        split === 'combined'
            ? 'Meters over time'
            : split === 'byMachine'
            ? 'Meters by machine'
            : 'Meters by fabric';
    if (!rows?.length || !keys.meterKey)
        return {
            title,
            data: [],
            series: [] as { key: string; label: string }[],
        };

    const normRaw = rows.map((r) => {
        const rawTime = keys.timeKey
            ? r[keys.timeKey]
            : r.time ?? r.date ?? r.start;
        const xISO = normalizeTime(rawTime, r);
        const xTs = xISO ? new Date(xISO).getTime() : NaN;
        const xLabel =
            granularity === 'week' ? extractWeekLabel(rawTime) : undefined;
        return {
            xTs,
            xLabel,
            meters: Number(r[keys.meterKey as string]) || 0,
            machine: keys.machineKey ? safeStr(r[keys.machineKey]) : undefined,
            fabric: keys.fabricKey ? safeStr(r[keys.fabricKey]) : undefined,
        };
    });

    const norm = normRaw
        .filter((r) => Number.isFinite(r.xTs))
        .sort((a, b) => a.xTs - b.xTs);

    const hasModern = norm.some((n) => new Date(n.xTs).getFullYear() >= 2000);
    const cleaned = hasModern
        ? norm.filter((n) => new Date(n.xTs).getFullYear() >= 2000)
        : norm;

    return finalizeShape(cleaned as any[], split, title);
}

function finalizeShape(
    norm: Array<{
        xTs: number;
        xLabel?: string;
        meters: number;
        machine?: string;
        fabric?: string;
    }>,
    split: SplitMode,
    title: string
) {
    const groupKey =
        split === 'byMachine'
            ? 'machine'
            : split === 'byFabric'
            ? 'fabric'
            : undefined;

    if (!groupKey) {
        const byTime = new Map<number, number>();
        const labelByTs = new Map<number, string>();
        norm.forEach((r) => {
            byTime.set(r.xTs, (byTime.get(r.xTs) || 0) + r.meters);
            if (r.xLabel && !labelByTs.has(r.xTs))
                labelByTs.set(r.xTs, r.xLabel);
        });
        const data = Array.from(byTime.entries()).map(([xTs, val]) => ({
            xTs,
            meters: val,
            label: labelByTs.get(xTs),
        }));
        return { title, data, series: [{ key: 'meters', label: 'Meters' }] };
    }

    const seriesSet = new Set<string>();
    const matrix = new Map<number, Record<string, number>>();
    const labelByTs = new Map<number, string>();

    norm.forEach((r) => {
        const sKey = (r as any)[groupKey] || 'Unknown';
        seriesSet.add(sKey);
        const row = matrix.get(r.xTs) || {};
        row[sKey] = (row[sKey] || 0) + r.meters;
        matrix.set(r.xTs, row);
        if (r.xLabel && !labelByTs.has(r.xTs)) labelByTs.set(r.xTs, r.xLabel);
    });

    const data = Array.from(matrix.entries()).map(([xTs, seriesVals]) => ({
        xTs,
        ...seriesVals,
        label: labelByTs.get(xTs),
    }));
    const series = Array.from(seriesSet).map((s) => ({ key: s, label: s }));
    return { title, data, series };
}

// --------------- Time helpers ---------------
function normalizeTime(v: any, wholeRow?: any): string | undefined {
    if (v == null) return undefined;
    if (typeof v === 'object') {
        if ('start' in v) return normalizeTime((v as any).start);
        if ('date' in v) return normalizeTime((v as any).date);
    }
    if (typeof v === 'number') {
        const ms = v > 1e12 ? v : v * 1000;
        return new Date(ms).toISOString();
    }
    if (typeof v === 'string') {
        const wkIso =
            parseYearWeekExactly(v) ||
            yearWeekToISO(wholeRow?.year, wholeRow?.week);
        if (wkIso) return wkIso;
        const asDate = new Date(v);
        if (!Number.isNaN(asDate.getTime())) return asDate.toISOString();
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v))
            return new Date(v.replace(' ', 'T')).toISOString();
        if (/^\d{4}-\d{2}-\d{2}$/.test(v))
            return new Date(v + 'T00:00:00Z').toISOString();
    }
    return undefined;
}

function extractWeekLabel(v: any): string | undefined {
    if (typeof v !== 'string') return undefined;
    const m = v.match(/^(\d{4})-W(\d{2})$/);
    return m ? `${m[1]}-W${m[2]}` : undefined;
}

function parseYearWeekExactly(s: string): string | undefined {
    const m = s.match(/^(\d{4})-W(\d{2})$/);
    if (!m) return undefined;
    const year = Number(m[1]);
    const week = Number(m[2]);
    return yearWeekToISO(year, week) || undefined;
}

function yearWeekToISO(year?: number, week?: number): string | undefined {
    if (!year || !week) return undefined;
    const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    const dow = simple.getUTCDay() || 7; // 1..7 (Mon..Sun)
    const monday = new Date(simple);
    if (dow !== 1) monday.setUTCDate(simple.getUTCDate() - (dow - 1));
    return monday.toISOString();
}

// Inclusive end in UI → exclusive request uses addDaysISO(end, +1)
function addDaysISO(
    yyyyMmDd: string | undefined,
    days: number
): string | undefined {
    if (!yyyyMmDd) return undefined;
    const d = new Date(yyyyMmDd + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

function toISODate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function domainFromFilters(
    filters: Filters,
    data: any[]
): { minTs: number; maxTs: number } {
    let minTs = Number.POSITIVE_INFINITY;
    let maxTs = Number.NEGATIVE_INFINITY;
    if (filters.start) minTs = Date.parse(filters.start + 'T00:00:00Z');
    if (filters.end) {
        const endStart = Date.parse(filters.end + 'T00:00:00Z');
        maxTs = endStart + 24 * 60 * 60 * 1000 - 1; // inclusive end-of-day
    }
    if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) {
        for (const d of data) {
            const t = Number(d.xTs);
            if (Number.isFinite(t)) {
                if (t < minTs) minTs = t;
                if (t > maxTs) maxTs = t;
            }
        }
    }
    if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) {
        const now = Date.now();
        return { minTs: now - 7 * 24 * 3600e3, maxTs: now };
    }
    return { minTs, maxTs };
}

function generateTicks(g: Granularity, minTs: number, maxTs: number): number[] {
    const out: number[] = [];
    if (!Number.isFinite(minTs) || !Number.isFinite(maxTs) || minTs > maxTs)
        return out;
    const step =
        g === 'hour' ? 3600e3 : g === 'day' ? 24 * 3600e3 : 7 * 24 * 3600e3;
    const start = alignTs(minTs, g);
    for (let t = start; t <= maxTs; t += step) out.push(t);
    if (out[out.length - 1] !== maxTs) out.push(maxTs);
    return out;
}

function alignTs(ts: number, g: Granularity): number {
    const d = new Date(ts);
    if (g === 'hour') {
        d.setUTCMinutes(0, 0, 0);
        return d.getTime();
    }
    if (g === 'day') {
        d.setUTCHours(0, 0, 0, 0);
        return d.getTime();
    }
    d.setUTCHours(0, 0, 0, 0);
    const dow = d.getUTCDay() || 7; // 1..7
    d.setUTCDate(d.getUTCDate() - (dow - 1));
    return d.getTime();
}

function formatTickFromTs(ts: number, g: Granularity) {
    const d = new Date(ts);
    if (g === 'hour') return d.toLocaleTimeString([], { hour: '2-digit' });
    if (g === 'day')
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (g === 'week')
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return d.toLocaleString();
}

function shortTick(d: Date) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function summaryFrom(f: Filters) {
    const bits: string[] = [];
    if (f.start && f.end) bits.push(`${f.start} → ${f.end}`);
    else if (f.start) bits.push(`From ${f.start}`);
    else if (f.end) bits.push(`Until ${f.end}`);
    if (f.machine_id) bits.push(`Machine ${f.machine_id}`);
    if (f.fabric_id) bits.push(`Fabric ${f.fabric_id}`);
    return bits.join(' · ') || 'No filters';
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function safeStr(v: any): string {
    if (v === null || v === undefined) return 'Unknown';
    try {
        if (typeof v === 'object') {
            if ('label' in v) return String((v as any).label);
            if ('id' in v) return String((v as any).id);
            return JSON.stringify(v);
        }
        return String(v);
    } catch {
        return String(v);
    }
}
