"use client";

import React from "react";

export function OtherResultTab() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400">
      <h3 className="text-lg font-bold mb-2">Other Result Tab</h3>
      <p className="text-sm">Additional fields and custom results will be configured here.</p>
    </div>
  );
}

export function BidsTab() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400">
      <h3 className="text-lg font-bold mb-2">Bids Tab</h3>
      <p className="text-sm">Bids associated with this property condition report will be listed here.</p>
    </div>
  );
}

export function SummaryTab() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400">
      <h3 className="text-lg font-bold mb-2">Summary Report</h3>
      <p className="text-sm">A summary compilation of General Information, PCR-1, and PCR-2 will be rendered here for export.</p>
    </div>
  );
}
