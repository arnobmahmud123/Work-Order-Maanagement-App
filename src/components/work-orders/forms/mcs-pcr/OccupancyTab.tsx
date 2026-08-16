"use client";

import React from "react";
import { FormSection } from "../FormPrimitives";
import { Info } from "lucide-react";

export interface OccupancyIndicatorRow {
  indicator: string;
  comment: string;
  neighborInfo: string;
}

export interface OccupancyData {
  indicators: OccupancyIndicatorRow[];
}

export const defaultOccupancyData: OccupancyData = {
  indicators: [
    { indicator: "", comment: "", neighborInfo: "" },
    { indicator: "", comment: "", neighborInfo: "" },
    { indicator: "", comment: "", neighborInfo: "" },
    { indicator: "", comment: "", neighborInfo: "" },
  ],
};

interface OccupancyTabProps {
  data: OccupancyData;
  onChange: (data: OccupancyData) => void;
  enabled: boolean;
}

export function OccupancyTab({ data, onChange, enabled }: OccupancyTabProps) {
  const updateRow = (index: number, field: keyof OccupancyIndicatorRow, value: string) => {
    const newIndicators = [...(data?.indicators || defaultOccupancyData.indicators)];
    newIndicators[index] = {
      ...newIndicators[index],
      [field]: value,
    };
    onChange({
      ...data,
      indicators: newIndicators,
    });
  };

  const indicatorOptions = [
    { label: "-- Select Indicator --", value: "" },
    { label: "3rd party would not allow work to", value: "3rd party would not allow work to" },
    { label: "Activity/Noise can be heard inside", value: "Activity/Noise can be heard inside" },
    { label: "Cars in driveway", value: "Cars in driveway" },
    { label: "Confirmed with neighbor(s)", value: "Confirmed with neighbor(s)" },
    { label: "Contact", value: "Contact" },
    { label: "Furniture Present Inside", value: "Furniture Present Inside" },
    { label: "Furniture Present Outside", value: "Furniture Present Outside" },
    { label: "Garbage bins/Recycle bins appear", value: "Garbage bins/Recycle bins appear" },
    { label: "Mail Carrier", value: "Mail Carrier" },
    { label: "MailBox", value: "MailBox" },
    { label: "Meter", value: "Meter" },
    { label: "Neighbor", value: "Neighbor" },
    { label: "Not Provided", value: "Not Provided" },
    { label: "Other", value: "Other" },
    { label: "People seen inside", value: "People seen inside" },
    { label: "People seen outside", value: "People seen outside" },
    { label: "Personals Present in Garage", value: "Personals Present in Garage" },
    { label: "Personals Present Inside", value: "Personals Present Inside" },
    { label: "Personals Present Outside", value: "Personals Present Outside" },
    { label: "Pets/Animals Present", value: "Pets/Animals Present" },
    { label: "Radio/T.V. heard or seen", value: "Radio/T.V. heard or seen" },
    { label: "Utilities On", value: "Utilities On" },
    { label: "Vehicles Present", value: "Vehicles Present" },
    { label: "Visual", value: "Visual" },
    { label: "Yard Maintained", value: "Yard Maintained" },
  ];

  const rows = data?.indicators || defaultOccupancyData.indicators;

  return (
    <div className="space-y-6 max-w-5xl">
      <FormSection title="Occupancy Verification">
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-700 dark:text-amber-400">
            <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wide">Occupancy Indicator Requirement</p>
              <p className="text-[11px] font-bold mt-1">
                If the property is occupied, please provide a minimum of two occupancy indicators (indicator choice + comment).
              </p>
            </div>
          </div>

          {!enabled ? (
            <div className="py-8 text-center bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500">
                Occupancy indicators are disabled. They are only required if the property is marked as Occupied (Yes) under the Property Info tab.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {rows.map((row, index) => (
                <div 
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 hover:border-cyan-500/30 transition-colors"
                >
                  {/* Indicator Dropdown */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Occupancy Indicator {index + 1}
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={row.indicator}
                      onChange={(e) => updateRow(index, "indicator", e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
                    >
                      {indicatorOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Comment */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Comment
                      <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={row.comment}
                      placeholder="Please enter a comment..."
                      rows={1}
                      onChange={(e) => updateRow(index, "comment", e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none min-h-[36px] resize-y"
                    />
                  </div>

                  {/* Neighbor's Info */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Neighbor's info/address
                    </label>
                    <input
                      type="text"
                      value={row.neighborInfo}
                      placeholder="Enter neighbor's info/address..."
                      onChange={(e) => updateRow(index, "neighborInfo", e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>
    </div>
  );
}
