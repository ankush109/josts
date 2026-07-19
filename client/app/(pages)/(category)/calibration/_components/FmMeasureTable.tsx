"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import type { Parameter, Measurement, Range } from "@/types/calibration";
import { makeMeasurement } from "../utils";
import { uid } from "../utils";

type Variant = "fm36" | "fm36a" | "fm36b";

interface Props {
  param: Parameter;
  readOnly?: boolean;
  variant: Variant;
  onUpdateParam: (updated: Parameter) => void;
}

/**
 * Draft-report styled measurement table matching Josts' FM/36, FM/36A, FM/36B
 * form layouts. Uses the same underlying data model as the default table so
 * PDF generation is untouched. The Comparison variant (`fm36a`) additionally
 * writes to `Measurement.stdReadings` — an optional field.
 */
export default function FmMeasureTable({ param, readOnly, variant, onUpdateParam }: Props) {
  const isComparison = variant === "fm36a";

  const rows = 5;

  const updateRange = (rid: string, patch: Partial<Range>) =>
    onUpdateParam({
      ...param,
      ranges: param.ranges.map((r) => (r.id === rid ? { ...r, ...patch } : r)),
    });

  const updateMeasurement = (rid: string, mid: string, patch: Partial<Measurement>) =>
    onUpdateParam({
      ...param,
      ranges: param.ranges.map((r) =>
        r.id !== rid ? r : {
          ...r,
          measurements: r.measurements.map((m) => (m.id === mid ? { ...m, ...patch } : m)),
        }
      ),
    });

  const updateReading = (rid: string, mid: string, idx: number, val: string) =>
    onUpdateParam({
      ...param,
      ranges: param.ranges.map((r) =>
        r.id !== rid ? r : {
          ...r,
          measurements: r.measurements.map((m) =>
            m.id !== mid ? m : {
              ...m,
              readings: m.readings.map((v, i) => (i === idx ? val : v)),
            }
          ),
        }
      ),
    });

  const updateStdReading = (rid: string, mid: string, idx: number, val: string) =>
    onUpdateParam({
      ...param,
      ranges: param.ranges.map((r) =>
        r.id !== rid ? r : {
          ...r,
          measurements: r.measurements.map((m) => {
            if (m.id !== mid) return m;
            const current = m.stdReadings ?? Array(rows).fill("");
            return { ...m, stdReadings: current.map((v, i) => (i === idx ? val : v)) };
          }),
        }
      ),
    });

  const addRange = () =>
    onUpdateParam({
      ...param,
      ranges: [
        ...param.ranges,
        { id: uid(), label: "", measurements: [makeMeasurement()] },
      ],
    });

  const removeRange = (rid: string) =>
    onUpdateParam({ ...param, ranges: param.ranges.filter((r) => r.id !== rid) });

  const addMeasurement = (rid: string) =>
    onUpdateParam({
      ...param,
      ranges: param.ranges.map((r) =>
        r.id !== rid ? r : { ...r, measurements: [...r.measurements, makeMeasurement()] }
      ),
    });

  const removeMeasurement = (rid: string, mid: string) =>
    onUpdateParam({
      ...param,
      ranges: param.ranges.map((r) =>
        r.id !== rid ? r : {
          ...r,
          measurements: r.measurements.filter((m) => m.id !== mid),
        }
      ),
    });

  // Flatten (range, measurement) pairs into columns
  const columns = param.ranges.flatMap((r) => r.measurements.map((m) => ({ r, m })));

  const formatNo =
    variant === "fm36"  ? "JECL/KOL/LAB/FM/36"  :
    variant === "fm36a" ? "JECL/KOL/LAB/FM/36A" :
                          "JECL/KOL/LAB/FM/36B";
  const layoutLabel =
    variant === "fm36"  ? "Direct" :
    variant === "fm36a" ? "Comparison" :
                          "Direct — IR Tester";

  return (
    <div className="p-4">
      {/* Format header stripe like the PDF's DRAFT REPORT bar */}
      <div className="mb-3 flex items-center justify-between border-b border-zinc-300 dark:border-zinc-700 pb-2">
        <div>
          <div className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Draft Report · {layoutLabel}
          </div>
          <div className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 mt-0.5">
            Format No: <span className="font-semibold">{formatNo}</span>
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={addRange}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-dashed border-zinc-300 dark:border-zinc-600 text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Range
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11.5px]" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 140 }} />
            <col style={{ width: 96 }} />
            {columns.flatMap(({ m }) =>
              isComparison
                ? [
                    <col key={`${m.id}-std`} style={{ minWidth: 92 }} />,
                    <col key={`${m.id}-duc`} style={{ minWidth: 92 }} />,
                  ]
                : [<col key={m.id} style={{ minWidth: 120 }} />]
            )}
          </colgroup>

          <thead>
            {/* Parameter (Unit) — spans all columns */}
            <tr>
              <th
                colSpan={2}
                className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-right px-3 py-1.5 font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Parameter ({param.unit || "—"})
              </th>
              {columns.map(({ r, m }) => (
                <React.Fragment key={`p-${m.id}`}>
                  {isComparison ? (
                    <th
                      colSpan={2}
                      className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-center text-zinc-500 dark:text-zinc-400"
                    >
                      {r.label || "—"}
                    </th>
                  ) : (
                    <th className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-center text-zinc-500 dark:text-zinc-400">
                      {r.label || "—"}
                    </th>
                  )}
                </React.Fragment>
              ))}
            </tr>

            {/* Range row */}
            <tr>
              <th
                colSpan={2}
                className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-right px-3 py-1.5 font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Range
              </th>
              {param.ranges.map((r) => (
                <th
                  key={`range-${r.id}`}
                  colSpan={r.measurements.length * (isComparison ? 2 : 1)}
                  className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-0"
                >
                  <div className="flex items-center gap-1 px-2 py-1">
                    {param.isPredefined || readOnly ? (
                      <span className="flex-1 font-mono text-[11px] font-semibold text-center">
                        {r.label || "—"}
                      </span>
                    ) : (
                      <input
                        value={r.label}
                        onChange={(e) => updateRange(r.id, { label: e.target.value })}
                        placeholder="Range label"
                        className="flex-1 min-w-0 font-mono text-[11px] font-semibold bg-transparent border-none text-center outline-none placeholder:text-zinc-400"
                      />
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        title="Add measurement column"
                        onClick={() => addMeasurement(r.id)}
                        className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                    {!readOnly && !param.isPredefined && param.ranges.length > 1 && (
                      <button
                        type="button"
                        title="Remove range"
                        onClick={() => removeRange(r.id)}
                        className="p-0.5 text-zinc-400 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>

            {/* Set / Nom value row (or Set/Nominal Value for FM/36A) */}
            <tr>
              <th
                colSpan={2}
                className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-right px-3 py-1.5 font-semibold text-zinc-800 dark:text-zinc-200"
              >
                {isComparison ? "Set / Nominal Value" : "Set /Nom value (DUC/STD)"}
              </th>
              {columns.map(({ r, m }) => (
                <React.Fragment key={`nom-${m.id}`}>
                  {isComparison ? (
                    <th
                      colSpan={2}
                      className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-0"
                    >
                      <input
                        value={m.nomValue}
                        readOnly={readOnly}
                        onChange={(e) => updateMeasurement(r.id, m.id, { nomValue: e.target.value })}
                        placeholder="e.g. 1mV"
                        className="w-full h-7 font-mono text-[11px] text-center bg-transparent border-none outline-none placeholder:text-zinc-400"
                      />
                    </th>
                  ) : (
                    <th className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-0">
                      <div className="relative flex items-center">
                        <input
                          value={m.nomValue}
                          readOnly={readOnly}
                          onChange={(e) => updateMeasurement(r.id, m.id, { nomValue: e.target.value })}
                          placeholder="e.g. 1mV"
                          className="w-full h-7 font-mono text-[11px] text-center bg-transparent border-none outline-none placeholder:text-zinc-400"
                        />
                        {!readOnly && r.measurements.length > 1 && (
                          <button
                            type="button"
                            title="Remove column"
                            onClick={() => removeMeasurement(r.id, m.id)}
                            className="absolute right-0.5 p-0.5 text-zinc-400 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  )}
                </React.Fragment>
              ))}
            </tr>

            {/* DUC/STD Details subheader — only for Comparison */}
            {isComparison && (
              <tr>
                <th
                  colSpan={2}
                  className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-right px-3 py-1 font-semibold text-zinc-800 dark:text-zinc-200"
                >
                  DUC/STD Details
                </th>
                {columns.flatMap(({ m }) => [
                  <th
                    key={`std-${m.id}`}
                    className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1 py-1 text-center text-[10.5px] font-semibold text-zinc-600 dark:text-zinc-400"
                  >
                    STD Value
                  </th>,
                  <th
                    key={`duc-${m.id}`}
                    className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1 py-1 text-center text-[10.5px] font-semibold text-zinc-600 dark:text-zinc-400"
                  >
                    DUC Value
                  </th>,
                ])}
              </tr>
            )}
          </thead>

          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                {i === 0 && (
                  <td
                    rowSpan={rows}
                    className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-center align-middle px-2 py-1 font-semibold text-zinc-800 dark:text-zinc-200 leading-tight"
                  >
                    Measured Value
                    <br />
                    in Standard
                    <br />
                    Unit / Device
                    <br />
                    Under Calibration
                  </td>
                )}
                <td className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-center px-2 py-1 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                  Reading {i + 1}
                </td>
                {columns.map(({ r, m }) =>
                  isComparison ? (
                    <React.Fragment key={`row-${i}-${m.id}`}>
                      <td className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-0">
                        <input
                          value={(m.stdReadings ?? [])[i] ?? ""}
                          readOnly={readOnly}
                          onChange={(e) => updateStdReading(r.id, m.id, i, e.target.value)}
                          className="w-full h-7 font-mono text-[11px] text-center bg-transparent border-none outline-none"
                        />
                      </td>
                      <td className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-0">
                        <input
                          value={m.readings[i] ?? ""}
                          readOnly={readOnly}
                          onChange={(e) => updateReading(r.id, m.id, i, e.target.value)}
                          className="w-full h-7 font-mono text-[11px] text-center bg-transparent border-none outline-none"
                        />
                      </td>
                    </React.Fragment>
                  ) : (
                    <td key={`row-${i}-${m.id}`} className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-0">
                      <input
                        value={m.readings[i] ?? ""}
                        readOnly={readOnly}
                        onChange={(e) => updateReading(r.id, m.id, i, e.target.value)}
                        className="w-full h-7 font-mono text-[11px] text-center bg-transparent border-none outline-none"
                      />
                    </td>
                  )
                )}
              </tr>
            ))}

            {/* Mean Value row */}
            <tr>
              <td
                colSpan={2}
                className="border border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-center px-3 py-1 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap"
              >
                Mean Value
              </td>
              {columns.map(({ m }) => {
                const meanTxt = (() => {
                  const v = m.computed?.meanValue;
                  return v != null ? Number(v).toFixed(4) : "";
                })();
                return isComparison ? (
                  <React.Fragment key={`mean-${m.id}`}>
                    <td className="border border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 font-mono text-[11px] text-center px-1 py-1 text-zinc-500 dark:text-zinc-400">
                      —
                    </td>
                    <td className="border border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 font-mono text-[11px] text-center px-1 py-1 text-zinc-800 dark:text-zinc-200">
                      {meanTxt}
                    </td>
                  </React.Fragment>
                ) : (
                  <td key={`mean-${m.id}`} className="border border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 font-mono text-[11px] text-center px-1 py-1 text-zinc-800 dark:text-zinc-200">
                    {meanTxt}
                  </td>
                );
              })}
            </tr>

            {/* Corrected Value row */}
            <tr>
              <td
                colSpan={2}
                className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-center px-3 py-1 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap leading-tight"
              >
                Corrected Value
                <br />
                <span className="text-[9px] font-normal text-zinc-400">
                  (After correction factor)
                </span>
              </td>
              {columns.map(({ r, m }) =>
                isComparison ? (
                  <React.Fragment key={`corr-${m.id}`}>
                    <td className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-0 text-zinc-400 text-center">—</td>
                    <td className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-0">
                      <input
                        value={m.corrected}
                        readOnly={readOnly}
                        onChange={(e) => updateMeasurement(r.id, m.id, { corrected: e.target.value })}
                        className="w-full h-7 font-mono text-[11px] text-center bg-transparent border-none outline-none"
                      />
                    </td>
                  </React.Fragment>
                ) : (
                  <td key={`corr-${m.id}`} className="border border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-0">
                    <input
                      value={m.corrected}
                      readOnly={readOnly}
                      onChange={(e) => updateMeasurement(r.id, m.id, { corrected: e.target.value })}
                      className="w-full h-7 font-mono text-[11px] text-center bg-transparent border-none outline-none"
                    />
                  </td>
                )
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {columns.length === 0 && (
        <div className="mt-6 text-center text-zinc-400 text-[12px]">
          No ranges yet. Click <span className="font-mono">+ Add Range</span> to start entering measurements.
        </div>
      )}
    </div>
  );
}
