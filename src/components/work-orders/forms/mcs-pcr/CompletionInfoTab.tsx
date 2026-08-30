"use client";

import React, { useEffect } from "react";
import { FormSection } from "../FormPrimitives";
import { CheckSquare, HelpCircle, Trash2 } from "lucide-react";

export interface CompletionInfoTask {
  taskId: string;
  pending: boolean;
  done: boolean;
  na: boolean;
  multiDay: boolean;
  completedDate: string;
  description: string;
  vendorComment: string;
  mcsComment: string;
  imgCount: number;
  woInstructions: string;
}

export interface CompletionInfoData {
  dateWorkCompleted: string;
  propertyLotSize: string;
  maintainedArea: string;
  lotCondition: string;
  totalLawnArea: string;
  snowReason: string;
  snowOtherText: string;
  tasks: CompletionInfoTask[];
}

export const defaultCompletionInfoData: CompletionInfoData = {
  dateWorkCompleted: "",
  propertyLotSize: "",
  maintainedArea: "",
  lotCondition: "",
  totalLawnArea: "",
  snowReason: "",
  snowOtherText: "",
  tasks: [],
};

interface CompletionInfoTabProps {
  data: CompletionInfoData;
  onChange: (v: CompletionInfoData) => void;
  woTasks: any[];
}

export function CompletionInfoTab({ data, onChange, woTasks }: CompletionInfoTabProps) {
  // Safe helper to update a top-level field
  const updateField = <K extends keyof CompletionInfoData>(field: K, value: CompletionInfoData[K]) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  // Sync work order tasks to completion info task list on initial load
  useEffect(() => {
    if (woTasks && woTasks.length > 0 && (!data.tasks || data.tasks.length === 0)) {
      const todayStr = new Date().toISOString().split("T")[0];
      const defaultDate = data.dateWorkCompleted || todayStr;
      
      const initialTasks = woTasks.map((t) => ({
        taskId: t.id,
        pending: t.status !== "COMPLETED",
        done: t.completed || t.status === "COMPLETED",
        na: false,
        multiDay: false,
        completedDate: defaultDate,
        description: t.title || "", // Default description as task title
        vendorComment: t.description || "", // Default vendor comment as task description details
        mcsComment: "",
        imgCount: t.photos?.length || 0,
        woInstructions: t.description || "",
      }));

      onChange({
        ...data,
        tasks: initialTasks,
      });
    }
  }, [woTasks]);

  // Update a single task field in the array
  const updateTask = (index: number, updates: Partial<CompletionInfoTask>) => {
    const updatedTasks = [...(data.tasks || [])];
    updatedTasks[index] = {
      ...updatedTasks[index],
      ...updates,
    };
    
    // Auto-exclusivity for Pending, Done, N/A checkboxes
    if (updates.pending) {
      updatedTasks[index].done = false;
      updatedTasks[index].na = false;
    } else if (updates.done) {
      updatedTasks[index].pending = false;
      updatedTasks[index].na = false;
    } else if (updates.na) {
      updatedTasks[index].pending = false;
      updatedTasks[index].done = false;
    }

    onChange({
      ...data,
      tasks: updatedTasks,
    });
  };

  const handleAddTask = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const defaultDate = data.dateWorkCompleted || todayStr;
    const newTask: CompletionInfoTask = {
      taskId: `custom-${Date.now()}`,
      pending: true,
      done: false,
      na: false,
      multiDay: false,
      completedDate: defaultDate,
      description: "",
      vendorComment: "",
      mcsComment: "",
      imgCount: 0,
      woInstructions: "",
    };
    onChange({
      ...data,
      tasks: [...(data.tasks || []), newTask],
    });
  };

  const handleDeleteTask = (index: number) => {
    const updatedTasks = (data.tasks || []).filter((_, i) => i !== index);
    onChange({
      ...data,
      tasks: updatedTasks,
    });
  };

  const lotConditionOptions = [
    { label: "-- Select Condition --", value: "" },
    { label: "Maintained", value: "Maintained" },
    { label: "Needs Cut", value: "Needs Cut" },
    { label: "Overgrown", value: "Overgrown" },
    { label: "Unable to Verify", value: "Unable to Verify" },
  ];

  return (
    <div className="space-y-6 max-w-full">
      {/* Top Completion Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <CheckSquare className="h-4.5 w-4.5 text-cyan-500" />
            Completion Checklist
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5">Define work status, dates, and vendor specifications</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">Date Work Completed:</label>
          <input
            type="date"
            value={data.dateWorkCompleted}
            onChange={(e) => updateField("dateWorkCompleted", e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grass Cut Info */}
        <FormSection title="Grass Cut Information">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Property Lot Size (SqFt):</label>
              <input
                type="text"
                placeholder="e.g. 11,761"
                value={data.propertyLotSize}
                onChange={(e) => updateField("propertyLotSize", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Lot Condition Upon:</label>
              <select
                value={data.lotCondition}
                onChange={(e) => updateField("lotCondition", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {lotConditionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Maintained Area (SqFt):</label>
              <input
                type="text"
                placeholder="e.g. 10,849"
                value={data.maintainedArea}
                onChange={(e) => updateField("maintainedArea", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Lawn Area:</label>
              <input
                type="text"
                placeholder="e.g. 10,849"
                value={data.totalLawnArea}
                onChange={(e) => updateField("totalLawnArea", e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-3 mt-2">
            <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5" />
              Entries provided will display in the line item comments.
            </p>
          </div>
        </FormSection>

        {/* Snow Removal Info */}
        <FormSection title="Snow Removal Information">
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reason Snow Removal Not Done:</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="snowReason"
                  checked={data.snowReason === "HOA"}
                  onChange={() => updateField("snowReason", "HOA")}
                  className="text-cyan-500 focus:ring-cyan-500"
                />
                Removed by HOA, COA, etc.
              </label>
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="snowReason"
                  checked={data.snowReason === "Unknown"}
                  onChange={() => updateField("snowReason", "Unknown")}
                  className="text-cyan-500 focus:ring-cyan-500"
                />
                Removed by Unknown
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                  <input
                    type="radio"
                    name="snowReason"
                    checked={data.snowReason === "Other"}
                    onChange={() => updateField("snowReason", "Other")}
                    className="text-cyan-500 focus:ring-cyan-500"
                  />
                  Other:
                </label>
                {data.snowReason === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter reason..."
                    value={data.snowOtherText}
                    onChange={(e) => updateField("snowOtherText", e.target.value)}
                    className="flex-1 px-3 py-1 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                )}
              </div>
            </div>
            <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-3 mt-1">
              <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5" />
                Entries provided will display in the line item comments.
              </p>
            </div>
          </div>
        </FormSection>
      </div>

      {/* Task Line Items Table */}
      <div className="border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-md">
        <div className="bg-slate-100 dark:bg-slate-800/50 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Line Item Tasks Status</h4>
          <button
            type="button"
            onClick={handleAddTask}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
          >
            + Add Task
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-black uppercase text-[10px] tracking-wider select-none">
                <th className="py-3 px-3 text-center w-16">Pending</th>
                <th className="py-3 px-3 text-center w-16">Done</th>
                <th className="py-3 px-3 text-center w-16">N/A</th>
                <th className="py-3 px-3 text-center w-16">Multi-Day</th>
                <th className="py-3 px-4 w-40">Completed</th>
                <th className="py-3 px-4 w-72">Description</th>
                <th className="py-3 px-4">Vendor's Comment (to MCS)</th>
                <th className="py-3 px-4 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {!data.tasks || data.tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 px-4 text-center text-slate-400 font-bold">
                    No tasks added. Click "+ Add Task" to add a new task item.
                  </td>
                </tr>
              ) : (
                data.tasks.map((task, index) => (
                  <tr key={task.taskId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    {/* Pending Checkbox */}
                    <td className="py-3.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={task.pending}
                        onChange={(e) => updateTask(index, { pending: e.target.checked })}
                        className="rounded border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-cyan-500 h-4 w-4 cursor-pointer"
                      />
                    </td>

                    {/* Done Checkbox */}
                    <td className="py-3.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={(e) => updateTask(index, { done: e.target.checked })}
                        className="rounded border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-cyan-500 h-4 w-4 cursor-pointer"
                      />
                    </td>

                    {/* N/A Checkbox */}
                    <td className="py-3.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={task.na}
                        onChange={(e) => updateTask(index, { na: e.target.checked })}
                        className="rounded border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-cyan-500 h-4 w-4 cursor-pointer"
                      />
                    </td>

                    {/* Multi-Day Checkbox */}
                    <td className="py-3.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={task.multiDay}
                        onChange={(e) => updateTask(index, { multiDay: e.target.checked })}
                        className="rounded border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-cyan-500 h-4 w-4 cursor-pointer"
                      />
                    </td>

                    {/* Completed Date */}
                    <td className="py-3 px-2">
                      <input
                        type="date"
                        value={task.completedDate}
                        onChange={(e) => updateTask(index, { completedDate: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none shadow-sm"
                      />
                    </td>

                    {/* Description */}
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={task.description}
                        onChange={(e) => updateTask(index, { description: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none shadow-sm"
                      />
                    </td>

                    {/* Vendor's Comment */}
                    <td className="py-3 px-2">
                      <textarea
                        value={task.vendorComment}
                        rows={1}
                        onChange={(e) => updateTask(index, { vendorComment: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none shadow-sm resize-y min-h-[32px]"
                      />
                    </td>

                    {/* Delete action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(index)}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
