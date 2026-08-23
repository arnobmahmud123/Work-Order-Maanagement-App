import { CanonicalServiceCode } from "@/connectors/core/connector-types";

// Default standard dictionary of service keyword mappings
const DEFAULT_SERVICE_PATTERNS: Array<{ pattern: RegExp; code: CanonicalServiceCode }> = [
  { pattern: /grass|lawn|mow|mowing|yard\s*maintenance|cut\s*grass/i, code: "GRASS_CUT" },
  { pattern: /debris|trash|clean\s*out|rubbish|dump|haul\s*away|junk/i, code: "DEBRIS_REMOVAL" },
  { pattern: /winteriz|wint|drain\s*plumb|anti\s*freeze/i, code: "WINTERIZATION" },
  { pattern: /board\s*up|board|secure|plywood|glaze|window\s*board/i, code: "BOARD_UP" },
  { pattern: /lock\s*change|rekey|padlock|hasp|knob|deadbolt|lockbox/i, code: "LOCK_CHANGE" },
  { pattern: /inspect|occupancy\s*check|property\s*condition|pcr|pvd/i, code: "INSPECTION" },
  { pattern: /roof|tarp|leak\s*repair|patch\s*roof/i, code: "ROOF_TARP" },
  { pattern: /mold|remediat|mildew|fungus/i, code: "MOLD_REMEDIATION" },
  { pattern: /pool|spa|algae|shock\s*pool/i, code: "POOL_MAINTENANCE" },
  { pattern: /tree|trim|shrub|branch|stump/i, code: "TREE_TRIMMING" },
  { pattern: /pressure\s*wash|power\s*wash|siding\s*clean/i, code: "PRESSURE_WASH" },
  { pattern: /snow|ice|plow|salting|shovel/i, code: "SNOW_REMOVAL" },
  { pattern: /janitorial|maid|interior\s*clean|sales\s*clean/i, code: "JANITORIAL" },
  { pattern: /plumb|pipe|faucet|toilet|drain|water\s*heater/i, code: "PLUMBING_REPAIR" },
  { pattern: /electric|wiring|breaker|panel|light/i, code: "ELECTRIC_REPAIR" },
  { pattern: /hvac|furnace|ac\s*unit|heat|air\s*condition/i, code: "HVAC_SERVICE" },
  { pattern: /reconvey|fha|hud\s*convey/i, code: "RECONVEYANCE" },
  { pattern: /bid|estimate|quote|proposal/i, code: "BID_SUBMISSION" },
];

export class ServiceMapper {
  private customMappings: Map<string, CanonicalServiceCode> = new Map();

  constructor(customRules?: Array<{ externalCodeOrName: string; internalCode: CanonicalServiceCode }>) {
    if (customRules) {
      for (const rule of customRules) {
        this.customMappings.set(rule.externalCodeOrName.trim().toLowerCase(), rule.internalCode);
      }
    }
  }

  /**
   * Normalize an external service title or code into a CanonicalServiceCode
   */
  public mapService(externalNameOrCode?: string): { code: CanonicalServiceCode; matchedByName: boolean } {
    if (!externalNameOrCode || !externalNameOrCode.trim()) {
      return { code: "OTHER", matchedByName: false };
    }

    const clean = externalNameOrCode.trim().toLowerCase();

    // 1. Direct custom DB mapping lookup
    if (this.customMappings.has(clean)) {
      return { code: this.customMappings.get(clean)!, matchedByName: true };
    }

    // 2. Exact match on Canonical enum
    const exactEnum = clean.toUpperCase().replace(/[\s-]/g, "_") as CanonicalServiceCode;
    const validEnums: CanonicalServiceCode[] = [
      "GRASS_CUT", "DEBRIS_REMOVAL", "WINTERIZATION", "BOARD_UP", "INSPECTION",
      "LOCK_CHANGE", "ROOF_TARP", "MOLD_REMEDIATION", "POOL_MAINTENANCE",
      "TREE_TRIMMING", "PRESSURE_WASH", "SNOW_REMOVAL", "JANITORIAL",
      "PLUMBING_REPAIR", "ELECTRIC_REPAIR", "HVAC_SERVICE", "GENERAL_REPAIRS",
      "RECONVEYANCE", "BID_SUBMISSION", "OTHER"
    ];
    if (validEnums.includes(exactEnum)) {
      return { code: exactEnum, matchedByName: true };
    }

    // 3. Pattern matching heuristics
    for (const item of DEFAULT_SERVICE_PATTERNS) {
      if (item.pattern.test(clean)) {
        return { code: item.code, matchedByName: true };
      }
    }

    return { code: "OTHER", matchedByName: false };
  }
}
