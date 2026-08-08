"use client";

import React from "react";
import {
  RadioGroup,
  TextField,
  TextAreaField,
  FormSection,
} from "../FormPrimitives";

export interface PCR1Data {
  dwellingType: string;
  numberOfStories: string;
  unit1Num: string;
  unit1Occupancy: string;
  unit1Secure: string;
  unit2Num: string;
  unit2Occupancy: string;
  unit2Secure: string;
  unit3Num: string;
  unit3Occupancy: string;
  unit3Secure: string;
  unit4Num: string;
  unit4Occupancy: string;
  unit4Secure: string;
  model: string;
  size: string;
  vin: string;
  hud: string;
  reasonVinHudNotCompleted: string;
  inMobileHomePark: string;
  onFoundation: string;
  affixedToProperty: string;
  strappingInPlace: string;
  skirtingInstalled: string;
  permanentStructureAttached: string;
  wheelsRemoved: string;
  axlesRemoved: string;
  tongueRemoved: string;
  mobileHomeComments: string;
  occupancyStatus: string;
  constructionType: string;
  garageType: string;
  additionalStructures: string;
  exteriorConditions: string;
  constructionInProgress: string;
  dwellingComments: string;
  
  // Property and Neighborhood
  highVandalismArea: string;
  lawnType: string;
  roofTarpPresent: string;
  roofSagging: string;
  roofDebris: string;
  gutterDebris: string;
  roofType: string;
  isPropertyForRent: string;
  isPropertyForSale: string;
  usrSymbolOnBuilding: string;
  neighborhoodComments: string;

  // Pool/Spa
  poolOnSite: string;
  poolType: string;
  isPoolSecure: string;
  poolSecuringRecommended: string;
  poolSecuringRecommendedExplain: string;
  spaHotTubOnSite: string;
  otherWaterFeaturesRequireMaint: string;
  otherWaterFeaturesExplain: string;
  poolComments: string;

  // Interior
  wasInteriorInspectionCompleted: string;
  secureUponArrival: string;
  interiorConditions: string;
  attic: string;
  basement: string;
  interiorStandingWater: string;
  personalPropertyOrDebris: string;
  sumpPumpAndOrBasin: string;
  sumpPumpOperational: string;
  dehumidifierOperational: string;
  dishwasher: string;
  refrigerator: string;
  dryer: string;
  waterHeater: string;
  builtinMicrowave: string;
  kitchenVent: string;
  furnace: string;
  hvacUnit: string;
  washer: string;
  garbageDisposal: string;
  windowAcUnit: string;
  range: string;
  stove: string;
  interiorOther: string;
  interiorComments: string;
}

export const defaultPCR1Data: PCR1Data = {
  dwellingType: "",
  numberOfStories: "",
  unit1Num: "",
  unit1Occupancy: "",
  unit1Secure: "",
  unit2Num: "",
  unit2Occupancy: "",
  unit2Secure: "",
  unit3Num: "",
  unit3Occupancy: "",
  unit3Secure: "",
  unit4Num: "",
  unit4Occupancy: "",
  unit4Secure: "",
  model: "",
  size: "",
  vin: "",
  hud: "",
  reasonVinHudNotCompleted: "",
  inMobileHomePark: "",
  onFoundation: "",
  affixedToProperty: "",
  strappingInPlace: "",
  skirtingInstalled: "",
  permanentStructureAttached: "",
  wheelsRemoved: "",
  axlesRemoved: "",
  tongueRemoved: "",
  mobileHomeComments: "",
  occupancyStatus: "",
  constructionType: "",
  garageType: "",
  additionalStructures: "",
  exteriorConditions: "",
  constructionInProgress: "",
  dwellingComments: "",
  highVandalismArea: "",
  lawnType: "",
  roofTarpPresent: "",
  roofSagging: "",
  roofDebris: "",
  gutterDebris: "",
  roofType: "",
  isPropertyForRent: "",
  isPropertyForSale: "",
  usrSymbolOnBuilding: "",
  neighborhoodComments: "",
  poolOnSite: "",
  poolType: "",
  isPoolSecure: "",
  poolSecuringRecommended: "",
  poolSecuringRecommendedExplain: "",
  spaHotTubOnSite: "",
  otherWaterFeaturesRequireMaint: "",
  otherWaterFeaturesExplain: "",
  poolComments: "",
  wasInteriorInspectionCompleted: "",
  secureUponArrival: "",
  interiorConditions: "",
  attic: "",
  basement: "",
  interiorStandingWater: "",
  personalPropertyOrDebris: "",
  sumpPumpAndOrBasin: "",
  sumpPumpOperational: "",
  dehumidifierOperational: "",
  dishwasher: "",
  refrigerator: "",
  dryer: "",
  waterHeater: "",
  builtinMicrowave: "",
  kitchenVent: "",
  furnace: "",
  hvacUnit: "",
  washer: "",
  garbageDisposal: "",
  windowAcUnit: "",
  range: "",
  stove: "",
  interiorOther: "",
  interiorComments: "",
};

interface Props {
  data: PCR1Data;
  onChange: (data: PCR1Data) => void;
}

export function PCRTab1({ data, onChange }: Props) {
  const set = (key: keyof PCR1Data) => (value: string) =>
    onChange({ ...data, [key]: value });

  const yesNoOptions = [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
  ];
  const yesNoUnableOptions = [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
    { label: "Unable To Determine", value: "unable" },
  ];
  const yesNoNaOptions = [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
    { label: "N/A", value: "na" },
  ];
  const goodFairPoorOptions = [
    { label: "Good", value: "good" },
    { label: "Fair", value: "fair" },
    { label: "Poor", value: "poor" },
    { label: "Other", value: "other" },
  ];

  return (
    <div className="space-y-5">
      {/* ── Dwelling and Occupancy Information ───────────────────────────── */}
      <FormSection title="Dwelling and Occupancy Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RadioGroup
            label="Dwelling Type?"
            name="dwellingType"
            options={[
              { label: "Single Family", value: "single" },
              { label: "Duplex", value: "duplex" },
              { label: "Triplex", value: "triplex" },
              { label: "Quadruplex", value: "quadruplex" },
              { label: "Town House Condo", value: "townhouse" },
              { label: "Mobile Manufactured Home", value: "mobile" },
              { label: "Vacant Lot", value: "vacant_lot" },
              { label: "Other", value: "other" },
            ]}
            value={data.dwellingType}
            onChange={set("dwellingType")}
          />
          <RadioGroup
            label="Number of stories?"
            name="numberOfStories"
            options={[
              { label: "1", value: "1" },
              { label: "2", value: "2" },
              { label: "3", value: "3" },
              { label: "4 or more", value: "4" },
            ]}
            value={data.numberOfStories}
            onChange={set("numberOfStories")}
          />
        </div>

        {/* Units table-like structure */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3 bg-slate-50 dark:bg-slate-900/50">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Unit Occupancy and Security Status</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            <TextField label="Unit 1 ID/Number" value={data.unit1Num} onChange={set("unit1Num")} />
            <RadioGroup
              label="Unit 1 Occupancy"
              name="unit1Occupancy"
              options={[{ label: "Occupied", value: "occupied" }, { label: "Vacant", value: "vacant" }]}
              value={data.unit1Occupancy}
              onChange={set("unit1Occupancy")}
            />
            <RadioGroup
              label="Unit 1 Secure"
              name="unit1Secure"
              options={[{ label: "Secure", value: "secure" }, { label: "Not Secure", value: "unsecure" }]}
              value={data.unit1Secure}
              onChange={set("unit1Secure")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            <TextField label="Unit 2 ID/Number" value={data.unit2Num} onChange={set("unit2Num")} />
            <RadioGroup
              label="Unit 2 Occupancy"
              name="unit2Occupancy"
              options={[{ label: "Occupied", value: "occupied" }, { label: "Vacant", value: "vacant" }]}
              value={data.unit2Occupancy}
              onChange={set("unit2Occupancy")}
            />
            <RadioGroup
              label="Unit 2 Secure"
              name="unit2Secure"
              options={[{ label: "Secure", value: "secure" }, { label: "Not Secure", value: "unsecure" }]}
              value={data.unit2Secure}
              onChange={set("unit2Secure")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextField label="Unit 3 ID/Number" value={data.unit3Num} onChange={set("unit3Num")} />
            <RadioGroup
              label="Unit 3 Occupancy"
              name="unit3Occupancy"
              options={[{ label: "Occupied", value: "occupied" }, { label: "Vacant", value: "vacant" }]}
              value={data.unit3Occupancy}
              onChange={set("unit3Occupancy")}
            />
            <RadioGroup
              label="Unit 3 Secure"
              name="unit3Secure"
              options={[{ label: "Secure", value: "secure" }, { label: "Not Secure", value: "unsecure" }]}
              value={data.unit3Secure}
              onChange={set("unit3Secure")}
            />
          </div>
        </div>

        {/* Mobile home fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="Model" value={data.model} onChange={set("model")} />
          <RadioGroup
            label="Size"
            name="size"
            options={[{ label: "Single", value: "single" }, { label: "Double", value: "double" }, { label: "Triple", value: "triple" }]}
            value={data.size}
            onChange={set("size")}
          />
          <TextField label="VIN #" value={data.vin} onChange={set("vin")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField label="HUD #" value={data.hud} onChange={set("hud")} />
          <TextField label="Reason VIN/HUD Not Completed" value={data.reasonVinHudNotCompleted} onChange={set("reasonVinHudNotCompleted")} />
          <RadioGroup
            label="In Mobile Home Park?"
            name="inMobileHomePark"
            options={yesNoOptions}
            value={data.inMobileHomePark}
            onChange={set("inMobileHomePark")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="On Foundation" name="onFoundation" options={yesNoUnableOptions} value={data.onFoundation} onChange={set("onFoundation")} />
          <RadioGroup label="Affixed to Property" name="affixedToProperty" options={yesNoUnableOptions} value={data.affixedToProperty} onChange={set("affixedToProperty")} />
          <RadioGroup label="Strapping in Place" name="strappingInPlace" options={yesNoUnableOptions} value={data.strappingInPlace} onChange={set("strappingInPlace")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Skirting Installed" name="skirtingInstalled" options={yesNoUnableOptions} value={data.skirtingInstalled} onChange={set("skirtingInstalled")} />
          <RadioGroup label="Permanent Structure Attached" name="permanentStructureAttached" options={yesNoUnableOptions} value={data.permanentStructureAttached} onChange={set("permanentStructureAttached")} />
          <RadioGroup label="Wheels Removed" name="wheelsRemoved" options={yesNoUnableOptions} value={data.wheelsRemoved} onChange={set("wheelsRemoved")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Axles Removed" name="axlesRemoved" options={yesNoUnableOptions} value={data.axlesRemoved} onChange={set("axlesRemoved")} />
          <RadioGroup label="Tongue Removed" name="tongueRemoved" options={yesNoUnableOptions} value={data.tongueRemoved} onChange={set("tongueRemoved")} />
        </div>

        <TextAreaField label="Mobile Home Comments" value={data.mobileHomeComments} onChange={set("mobileHomeComments")} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RadioGroup
            label="Occupancy Status?"
            name="occupancyStatus"
            options={[
              { label: "Occupied By Owner", value: "owner" },
              { label: "Occupied by renter", value: "renter" },
              { label: "Occupied by Unknown", value: "unknown_occupied" },
              { label: "Vacant Secure", value: "vacant_secure" },
              { label: "Vacant not secured", value: "vacant_unsecured" },
              { label: "Partial Vacant", value: "partial_vacant" },
              { label: "Partial Vacant Secured", value: "partial_secure" },
              { label: "Partial Vacant Not Secured", value: "partial_unsecure" },
              { label: "Unknown", value: "unknown" },
            ]}
            value={data.occupancyStatus}
            onChange={set("occupancyStatus")}
          />
          <RadioGroup
            label="Dwelling Status?"
            name="constructionType"
            options={[
              { label: "Frame", value: "frame" },
              { label: "Block", value: "block" },
              { label: "Stone", value: "stone" },
              { label: "Stucco", value: "stucco" },
              { label: "Other", value: "other" },
            ]}
            value={data.constructionType}
            onChange={set("constructionType")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RadioGroup
            label="Garage Type?"
            name="garageType"
            options={[
              { label: "Attached", value: "attached" },
              { label: "Detached", value: "detached" },
              { label: "Carport", value: "carport" },
              { label: "None", value: "none" },
              { label: "Other", value: "other" },
            ]}
            value={data.garageType}
            onChange={set("garageType")}
          />
          <RadioGroup
            label="Additional Structures on site?"
            name="additionalStructures"
            options={[
              { label: "Shed", value: "shed" },
              { label: "Barn", value: "barn" },
              { label: "Outbuilding", value: "outbuilding" },
              { label: "Carport", value: "carport" },
              { label: "Other", value: "other" },
            ]}
            value={data.additionalStructures}
            onChange={set("additionalStructures")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RadioGroup
            label="Exterior Dwelling Conditions?"
            name="exteriorConditions"
            options={goodFairPoorOptions}
            value={data.exteriorConditions}
            onChange={set("exteriorConditions")}
          />
          <RadioGroup
            label="Constructions In Progress?"
            name="constructionInProgress"
            options={[
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
              { label: "Unknown", value: "unknown" },
            ]}
            value={data.constructionInProgress}
            onChange={set("constructionInProgress")}
          />
        </div>

        <TextAreaField label="Comments" value={data.dwellingComments} onChange={set("dwellingComments")} />
      </FormSection>

      {/* ── Property and Neighborhood Information ───────────────────────── */}
      <FormSection title="Property and Neighborhood Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RadioGroup
            label="High Vandalism Area?"
            name="highVandalismArea"
            options={yesNoOptions}
            value={data.highVandalismArea}
            onChange={set("highVandalismArea")}
          />
          <RadioGroup
            label="Lawn Types?"
            name="lawnType"
            options={[
              { label: "Grass", value: "grass" },
              { label: "No Lawn", value: "no_lawn" },
              { label: "Desert Landscaping", value: "desert" },
              { label: "Bare Dirt", value: "bare" },
              { label: "Dead Lawn", value: "dead" },
              { label: "Straw Covered", value: "straw" },
              { label: "Other", value: "other" },
            ]}
            value={data.lawnType}
            onChange={set("lawnType")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Roof Tarp Present?" name="roofTarpPresent" options={yesNoUnableOptions} value={data.roofTarpPresent} onChange={set("roofTarpPresent")} />
          <RadioGroup label="Roof Sagging?" name="roofSagging" options={yesNoUnableOptions} value={data.roofSagging} onChange={set("roofSagging")} />
          <RadioGroup label="Roof Debris?" name="roofDebris" options={yesNoUnableOptions} value={data.roofDebris} onChange={set("roofDebris")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Gutter Debris/Growth?" name="gutterDebris" options={yesNoUnableOptions} value={data.gutterDebris} onChange={set("gutterDebris")} />
          <RadioGroup
            label="Roof Type?"
            name="roofType"
            options={[
              { label: "Asphalt Shingles", value: "asphalt" },
              { label: "Metal", value: "metal" },
              { label: "Slate", value: "slate" },
              { label: "Tile", value: "tile" },
              { label: "Wooden Shingles", value: "wood" },
              { label: "Other", value: "other" },
              { label: "Not Visible", value: "not_visible" },
            ]}
            value={data.roofType}
            onChange={set("roofType")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Is Property For Rent?" name="isPropertyForRent" options={yesNoOptions} value={data.isPropertyForRent} onChange={set("isPropertyForRent")} />
          <RadioGroup label="Is Property For Sale?" name="isPropertyForSale" options={yesNoOptions} value={data.isPropertyForSale} onChange={set("isPropertyForSale")} />
          <RadioGroup label="Urban Search and Rescue (US&R) Symbol on Building?" name="usrSymbolOnBuilding" options={yesNoOptions} value={data.usrSymbolOnBuilding} onChange={set("usrSymbolOnBuilding")} />
        </div>

        <TextAreaField label="Comments" value={data.neighborhoodComments} onChange={set("neighborhoodComments")} />
      </FormSection>

      {/* ── Pool, Spa/Hot Tub and Water Feature Information ──────────────── */}
      <FormSection title="Pool, Spa/Hot Tub and Water Feature Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Pool on site?" name="poolOnSite" options={yesNoOptions} value={data.poolOnSite} onChange={set("poolOnSite")} />
          <RadioGroup label="Pool Type" name="poolType" options={[{ label: "Above Ground", value: "above" }, { label: "In Ground", value: "inground" }]} value={data.poolType} onChange={set("poolType")} />
          <RadioGroup label="Is Pool Secure?" name="isPoolSecure" options={yesNoOptions} value={data.isPoolSecure} onChange={set("isPoolSecure")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RadioGroup label="Pool Securing recommended?" name="poolSecuringRecommended" options={yesNoOptions} value={data.poolSecuringRecommended} onChange={set("poolSecuringRecommended")} />
          <TextField label="If Securing recommended Explain" value={data.poolSecuringRecommendedExplain} onChange={set("poolSecuringRecommendedExplain")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RadioGroup label="Spa and/or HotTub on Site?" name="spaHotTubOnSite" options={yesNoOptions} value={data.spaHotTubOnSite} onChange={set("spaHotTubOnSite")} />
          <RadioGroup label="Other Water Features Require Maintenance?" name="otherWaterFeaturesRequireMaint" options={yesNoOptions} value={data.otherWaterFeaturesRequireMaint} onChange={set("otherWaterFeaturesRequireMaint")} />
        </div>

        <TextField label="If Yes, explain:" value={data.otherWaterFeaturesExplain} onChange={set("otherWaterFeaturesExplain")} />
        <TextAreaField label="Comments" value={data.poolComments} onChange={set("poolComments")} />
      </FormSection>

      {/* ── Interior Information ─────────────────────────────────────────── */}
      <FormSection title="Interior Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Was Interior Inspections Completed?" name="wasInteriorInspectionCompleted" options={yesNoOptions} value={data.wasInteriorInspectionCompleted} onChange={set("wasInteriorInspectionCompleted")} />
          <RadioGroup label="Secure Upon Arrival?" name="secureUponArrival" options={yesNoOptions} value={data.secureUponArrival} onChange={set("secureUponArrival")} />
          <RadioGroup label="Interior Dwelling Conditions?" name="interiorConditions" options={goodFairPoorOptions} value={data.interiorConditions} onChange={set("interiorConditions")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Attic?" name="attic" options={yesNoOptions} value={data.attic} onChange={set("attic")} />
          <RadioGroup label="Basement?" name="basement" options={yesNoOptions} value={data.basement} onChange={set("basement")} />
          <RadioGroup label="Interior Standing Water?" name="interiorStandingWater" options={yesNoOptions} value={data.interiorStandingWater} onChange={set("interiorStandingWater")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Personal Property or Debris?" name="personalPropertyOrDebris" options={yesNoOptions} value={data.personalPropertyOrDebris} onChange={set("personalPropertyOrDebris")} />
          <RadioGroup label="Sump Pump and/or Basin?" name="sumpPumpAndOrBasin" options={yesNoOptions} value={data.sumpPumpAndOrBasin} onChange={set("sumpPumpAndOrBasin")} />
          <RadioGroup label="Sump Pump Operational?" name="sumpPumpOperational" options={yesNoOptions} value={data.sumpPumpOperational} onChange={set("sumpPumpOperational")} />
        </div>

        {/* Appliances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Dehumidifier Operational?" name="dehumidifierOperational" options={yesNoNaOptions} value={data.dehumidifierOperational} onChange={set("dehumidifierOperational")} />
          <RadioGroup label="Dishwasher?" name="dishwasher" options={yesNoNaOptions} value={data.dishwasher} onChange={set("dishwasher")} />
          <RadioGroup label="Refrigerator?" name="refrigerator" options={yesNoNaOptions} value={data.refrigerator} onChange={set("refrigerator")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Dryer?" name="dryer" options={yesNoNaOptions} value={data.dryer} onChange={set("dryer")} />
          <RadioGroup label="Water Heater?" name="waterHeater" options={yesNoNaOptions} value={data.waterHeater} onChange={set("waterHeater")} />
          <RadioGroup label="Built in Microwave?" name="builtinMicrowave" options={yesNoNaOptions} value={data.builtinMicrowave} onChange={set("builtinMicrowave")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Kitchen Vent?" name="kitchenVent" options={yesNoNaOptions} value={data.kitchenVent} onChange={set("kitchenVent")} />
          <RadioGroup label="Furnace?" name="furnace" options={yesNoNaOptions} value={data.furnace} onChange={set("furnace")} />
          <RadioGroup label="HVAC Unit?" name="hvacUnit" options={yesNoNaOptions} value={data.hvacUnit} onChange={set("hvacUnit")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Washer?" name="washer" options={yesNoNaOptions} value={data.washer} onChange={set("washer")} />
          <RadioGroup label="Garbage Disposal?" name="garbageDisposal" options={yesNoNaOptions} value={data.garbageDisposal} onChange={set("garbageDisposal")} />
          <RadioGroup label="Window Ac Unit(s)?" name="windowAcUnit" options={yesNoNaOptions} value={data.windowAcUnit} onChange={set("windowAcUnit")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RadioGroup label="Range?" name="range" options={yesNoNaOptions} value={data.range} onChange={set("range")} />
          <RadioGroup label="Stove?" name="stove" options={yesNoNaOptions} value={data.stove} onChange={set("stove")} />
          <RadioGroup label="Other?" name="interiorOther" options={yesNoOptions} value={data.interiorOther} onChange={set("interiorOther")} />
        </div>

        <TextAreaField label="Comments" value={data.interiorComments} onChange={set("interiorComments")} />
      </FormSection>
    </div>
  );
}
