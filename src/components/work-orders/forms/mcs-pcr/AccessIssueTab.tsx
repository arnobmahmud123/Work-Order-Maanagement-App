"use client";

import React from "react";
import { FormSection } from "../FormPrimitives";

export interface AccessIssueData {
  // No Access Info
  noAccessReason: string;
  noAccessOtherReason: string;
  communityContactPosted: string;
  communityName: string;
  communityPhone: string;
  communityContactPerson: string;
  communityEmail: string;
  guardPresent: string;
  guardConversationResult: string;
  keypadPresent: string;
  keypadInfo: string;
  keypadOtherExplain: string;
  accessLetterUsed: string;
  accessLetterResult: string;
  mcsStaffContacted: string;
  mcsStaffName: string;
  noAccessAdditionalInfo: string;

  // Bad Address Info
  badAddressReason: string;
  badAddressMcsStaffContacted: string;
  badAddressMcsStaffName: string;
  ableToDetermineCorrectAddress: string;
  correctAddress: string;
  resourcesUsedToConfirm: string;
  badAddressAdditionalInfo: string;
}

export const defaultAccessIssueData: AccessIssueData = {
  noAccessReason: "",
  noAccessOtherReason: "",
  communityContactPosted: "",
  communityName: "",
  communityPhone: "",
  communityContactPerson: "",
  communityEmail: "",
  guardPresent: "",
  guardConversationResult: "",
  keypadPresent: "",
  keypadInfo: "",
  keypadOtherExplain: "",
  accessLetterUsed: "",
  accessLetterResult: "",
  mcsStaffContacted: "",
  mcsStaffName: "",
  noAccessAdditionalInfo: "",

  badAddressReason: "",
  badAddressMcsStaffContacted: "",
  badAddressMcsStaffName: "",
  ableToDetermineCorrectAddress: "",
  correctAddress: "",
  resourcesUsedToConfirm: "",
  badAddressAdditionalInfo: "",
};

interface AccessIssueTabProps {
  data: AccessIssueData;
  onChange: (data: AccessIssueData) => void;
  enabled: boolean;
}

export function AccessIssueTab({ data, onChange, enabled }: AccessIssueTabProps) {
  const updateField = (field: keyof AccessIssueData, value: string) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const yesNoOptions = [
    { label: "-- Select --", value: "" },
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" },
  ];

  const noAccessReasonOptions = [
    { label: "-- Select Reason --", value: "" },
    { label: "Gated Community", value: "Gated Community" },
    { label: "No Trespassing/Private Property Signs", value: "No Trespassing/Private Property Signs" },
    { label: "Closed Roads/Natural Disaster", value: "Closed Roads/Natural Disaster" },
    { label: "High Rise Condo", value: "High Rise Condo" },
    { label: "Property Gate/Padlock Key Needed", value: "Property Gate/Padlock Key Needed" },
    { label: "Keypad Code Needed", value: "Keypad Code Needed" },
    { label: "Private Gate", value: "Private Gate" },
    { label: "Other", value: "Other" },
  ];

  const badAddressReasonOptions = [
    { label: "-- Select Reason --", value: "" },
    { label: "Does Not Exist", value: "Does Not Exist" },
    { label: "Street Name Mismatch", value: "Street Name Mismatch" },
    { label: "Number Mismatch", value: "Number Mismatch" },
    { label: "Other", value: "Other" },
  ];

  const keypadInfoOptions = [
    { label: "-- Select Info --", value: "" },
    { label: "Needs Keypad Info", value: "Needs Keypad Info" },
    { label: "Obtained Code", value: "Obtained Code" },
    { label: "Other", value: "Other" },
  ];

  if (!enabled) {
    return (
      <div className="py-8 text-center bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 max-w-3xl">
        <p className="text-xs font-bold text-slate-500">
          Access Issue tab is disabled because the property was marked as accessible. It only becomes enabled when "UNABLE TO ACCESS THE PROPERTY?" is checked "Yes" under the Property Info tab.
        </p>
      </div>
    );
  }

  const currentData = data || defaultAccessIssueData;

  return (
    <div className="space-y-6 max-w-full">
      {/* Panel 1: No Access Info */}
      <FormSection title="No Access Info">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Please indicate why this is a No Access:
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={currentData.noAccessReason}
                onChange={(e) => updateField("noAccessReason", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {noAccessReasonOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {currentData.noAccessReason === "Other" && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">If "Other", please explain:</label>
                <textarea
                  value={currentData.noAccessOtherReason}
                  placeholder="Explain reason..."
                  rows={2}
                  onChange={(e) => updateField("noAccessOtherReason", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none min-h-[48px]"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Was community name/contact info posted?</label>
              <select
                value={currentData.communityContactPosted}
                onChange={(e) => updateField("communityContactPosted", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {yesNoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Community name:</label>
                <input
                  type="text"
                  placeholder="Community name"
                  value={currentData.communityName}
                  onChange={(e) => updateField("communityName", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Phone number:</label>
                <input
                  type="text"
                  placeholder="Phone number"
                  value={currentData.communityPhone}
                  onChange={(e) => updateField("communityPhone", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Contact person:</label>
                <input
                  type="text"
                  placeholder="Contact person"
                  value={currentData.communityContactPerson}
                  onChange={(e) => updateField("communityContactPerson", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">E-mail:</label>
                <input
                  type="email"
                  placeholder="E-mail"
                  value={currentData.communityEmail}
                  onChange={(e) => updateField("communityEmail", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Was a guard/doorman present?</label>
              <select
                value={currentData.guardPresent}
                onChange={(e) => updateField("guardPresent", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {yesNoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {currentData.guardPresent === "Yes" && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">guard/doorman conversation results:</label>
                <textarea
                  value={currentData.guardConversationResult}
                  placeholder="Summarize conversation..."
                  rows={2}
                  onChange={(e) => updateField("guardConversationResult", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none min-h-[48px]"
                />
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Was a keypad present?</label>
              <select
                value={currentData.keypadPresent}
                onChange={(e) => updateField("keypadPresent", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {yesNoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Keypad information:</label>
              <select
                value={currentData.keypadInfo}
                onChange={(e) => updateField("keypadInfo", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {keypadInfoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {currentData.keypadInfo === "Other" && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">If "Other", please explain:</label>
                <textarea
                  value={currentData.keypadOtherExplain}
                  placeholder="Explain..."
                  rows={2}
                  onChange={(e) => updateField("keypadOtherExplain", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none min-h-[48px]"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Was an access letter used?</label>
              <select
                value={currentData.accessLetterUsed}
                onChange={(e) => updateField("accessLetterUsed", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {yesNoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {currentData.accessLetterUsed === "Yes" && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">If "Yes", please provide the result of attempting to use letter:</label>
                <textarea
                  value={currentData.accessLetterResult}
                  placeholder="Describe attempts..."
                  rows={2}
                  onChange={(e) => updateField("accessLetterResult", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none min-h-[48px]"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Was MCS staff contacted?</label>
              <select
                value={currentData.mcsStaffContacted}
                onChange={(e) => updateField("mcsStaffContacted", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {yesNoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {currentData.mcsStaffContacted === "Yes" && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Name of MCS staff member:</label>
                <input
                  type="text"
                  placeholder="Staff Name"
                  value={currentData.mcsStaffName}
                  onChange={(e) => updateField("mcsStaffName", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Please provide any other information available about this No Access:</label>
          <textarea
            value={currentData.noAccessAdditionalInfo}
            placeholder="Enter additional details..."
            rows={3}
            onChange={(e) => updateField("noAccessAdditionalInfo", e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none min-h-[64px]"
          />
        </div>
      </FormSection>

      {/* Panel 2: Bad Address Info */}
      <FormSection title="Bad Address Info">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Please indicate why this is a bad address:</label>
              <select
                value={currentData.badAddressReason}
                onChange={(e) => updateField("badAddressReason", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {badAddressReasonOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Was MCS staff contacted?</label>
              <select
                value={currentData.badAddressMcsStaffContacted}
                onChange={(e) => updateField("badAddressMcsStaffContacted", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {yesNoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {currentData.badAddressMcsStaffContacted === "Yes" && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Name of MCS staff:</label>
                <input
                  type="text"
                  placeholder="Staff Name"
                  value={currentData.badAddressMcsStaffName}
                  onChange={(e) => updateField("badAddressMcsStaffName", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Were you able to determine the correct address?</label>
              <select
                value={currentData.ableToDetermineCorrectAddress}
                onChange={(e) => updateField("ableToDetermineCorrectAddress", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {yesNoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {currentData.ableToDetermineCorrectAddress === "Yes" && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">What is the correct address (include parcel # if available):</label>
                <input
                  type="text"
                  placeholder="Correct address..."
                  value={currentData.correctAddress}
                  onChange={(e) => updateField("correctAddress", e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">What resources were used to confirm bad address status?</label>
              <textarea
                value={currentData.resourcesUsedToConfirm}
                placeholder="List resources e.g. GIS, USPS, Neighbor..."
                rows={3}
                onChange={(e) => updateField("resourcesUsedToConfirm", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none min-h-[64px]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Please provide any other info available about this Bad Address:</label>
              <textarea
                value={currentData.badAddressAdditionalInfo}
                placeholder="Enter details..."
                rows={3}
                onChange={(e) => updateField("badAddressAdditionalInfo", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none min-h-[64px]"
              />
            </div>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
