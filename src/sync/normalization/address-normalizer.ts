export interface NormalizedAddressResult {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
  fullAddressString: string;
}

const US_STATES: Record<string, string> = {
  "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR", "CALIFORNIA": "CA",
  "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE", "FLORIDA": "FL", "GEORGIA": "GA",
  "HAWAII": "HI", "IDAHO": "ID", "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA",
  "KANSAS": "KS", "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD",
  "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN", "MISSISSIPPI": "MS", "MISSOURI": "MO",
  "MONTANA": "MT", "NEBRASKA": "NE", "NEVADA": "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM", "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH",
  "OKLAHOMA": "OK", "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT", "VERMONT": "VT",
  "VIRGINIA": "VA", "WASHINGTON": "WA", "WEST VIRGINIA": "WV", "WISCONSIN": "WI", "WYOMING": "WY",
  "DISTRICT OF COLUMBIA": "DC", "PUERTO RICO": "PR"
};

const STREET_ABBREVIATIONS: Record<string, string> = {
  "STREET": "St", "AVENUE": "Ave", "BOULEVARD": "Blvd", "DRIVE": "Dr", "ROAD": "Rd",
  "LANE": "Ln", "COURT": "Ct", "CIRCLE": "Cir", "PLACE": "Pl", "TERRACE": "Ter",
  "PARKWAY": "Pkwy", "HIGHWAY": "Hwy", "NORTH": "N", "SOUTH": "S", "EAST": "E", "WEST": "W"
};

export function normalizeAddress(input: {
  address1: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
}): NormalizedAddressResult {
  let raw1 = (input.address1 || "").trim();
  let raw2 = (input.address2 || "").trim();
  let city = (input.city || "").trim();
  let state = (input.state || "").trim().toUpperCase();
  let zip = (input.zip || "").trim();

  // If address1 contains full address (e.g. "123 Main St, Springfield, IL 62701")
  if ((!city || !state || !zip) && raw1.includes(",")) {
    const parts = raw1.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      raw1 = parts[0];
      if (parts.length === 2) {
        city = parts[1];
      } else if (parts.length >= 3) {
        city = parts[1];
        const stateZip = parts[2].split(/\s+/).filter(Boolean);
        if (stateZip.length >= 1) state = stateZip[0].toUpperCase();
        if (stateZip.length >= 2) zip = stateZip[1];
      }
    }
  }

  // Normalize State code
  if (state.length > 2 && US_STATES[state]) {
    state = US_STATES[state];
  }

  // Clean Zip (keep 5-digit or 9-digit standard)
  const zipMatch = zip.match(/\b\d{5}(?:-\d{4})?\b/);
  if (zipMatch) {
    zip = zipMatch[0];
  }

  // Standardize street abbreviations
  const words = raw1.split(/\s+/);
  const normalizedWords = words.map((w) => {
    const upper = w.toUpperCase().replace(/[.,]/g, "");
    return STREET_ABBREVIATIONS[upper] || (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  });
  const normalizedAddress1 = normalizedWords.join(" ");

  // Title case city
  const normalizedCity = city
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const fullAddressString = [
    normalizedAddress1,
    raw2 ? raw2 : undefined,
    normalizedCity,
    state ? `${state} ${zip}`.trim() : zip
  ].filter(Boolean).join(", ");

  return {
    address1: normalizedAddress1,
    address2: raw2 || undefined,
    city: normalizedCity,
    state,
    zip,
    county: input.county?.trim(),
    fullAddressString
  };
}
