/**
 * @fileoverview Adapts the Instrument master API into the in-memory shape
 * (`InstrumentPreset`) consumed by the calibration form.
 *
 * Replaces the hardcoded `INSTRUMENT_PRESETS` / `MAKE_TO_INSTRUMENT_KEY`
 * constants — presets are now editable in the Instruments admin page.
 */
import { useMemo } from "react";
import { useGetInstruments } from "./useGetInstruments";
import type { InstrumentPreset } from "@/app/(pages)/(category)/calibration/constants";

export interface InstrumentPresetData {
  /** Map of instrument key (e.g. "Fluke 8846A") → preset (params/units/samples). */
  presets:    Record<string, InstrumentPreset>;
  /** Map of selected "make" dropdown value → instrument key. */
  makeKeyMap: Record<string, string>;
  isLoading:  boolean;
  isError:    boolean;
}

export function useInstrumentPresets(): InstrumentPresetData {
  const { data, isLoading, isError } = useGetInstruments(1);

  return useMemo(() => {
    const presets:    Record<string, InstrumentPreset> = {};
    const makeKeyMap: Record<string, string>           = {};

    for (const inst of data?.data ?? []) {
      const params:  Record<string, string[]>   = {};
      const units:   Record<string, string>     = {};
      const samples: InstrumentPreset["samples"] = {};

      for (const p of inst.parameters ?? []) {
        params[p.parameterName]  = (p.ranges ?? []).map((r) => r.label);
        units[p.parameterName]   = p.unit   ?? "";
        samples[p.parameterName] = (p.samples ?? []).map((rangeRow) =>
          rangeRow.map((pt) => [pt.nominal, pt.readings] as [string, string[]])
        );
      }

      presets[inst.key]     = { params, units, samples };
      makeKeyMap[inst.make] = inst.key;
    }

    return { presets, makeKeyMap, isLoading, isError };
  }, [data, isLoading, isError]);
}
