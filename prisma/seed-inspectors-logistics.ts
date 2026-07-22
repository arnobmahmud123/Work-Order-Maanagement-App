// @ts-nocheck
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randFloat(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysFromNow(d: number) {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

// ─── Inspector Seed Data ─────────────────────────────────────────────────────

interface InspectorSeed {
  name: string;
  email: string;
  phone: string;
  company: string;
  bio: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  availability: "AVAILABLE" | "BUSY" | "UNAVAILABLE";
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  specialties: { specialty: string; yearsExp: number; certified: boolean }[];
}

const INSPECTORS: InspectorSeed[] = [
  {
    name: "Marcus Johnson",
    email: "mjohnson@premierinspects.com",
    phone: "(312) 555-0101",
    company: "Premier Inspection Services",
    bio: "Licensed master plumber with 18 years of experience in residential and commercial properties. Specializing in foreclosures and REO properties.",
    city: "Chicago", state: "IL", zipCode: "60601",
    latitude: 41.8781, longitude: -87.6298,
    availability: "AVAILABLE", rating: 4.9, reviewCount: 142, hourlyRate: 125,
    specialties: [
      { specialty: "PLUMBER", yearsExp: 18, certified: true },
      { specialty: "GENERAL", yearsExp: 15, certified: true },
    ],
  },
  {
    name: "Sarah Chen",
    email: "schen@electricpros.net",
    phone: "(312) 555-0102",
    company: "ElectricPros LLC",
    bio: "Certified electrical inspector with expertise in older homes and code compliance. FEMA-registered inspector.",
    city: "Chicago", state: "IL", zipCode: "60614",
    latitude: 41.9250, longitude: -87.6370,
    availability: "AVAILABLE", rating: 4.8, reviewCount: 98, hourlyRate: 150,
    specialties: [
      { specialty: "ELECTRICIAN", yearsExp: 12, certified: true },
      { specialty: "FIRE_SAFETY", yearsExp: 5, certified: true },
    ],
  },
  {
    name: "Robert Williams",
    email: "rwilliams@midwesthvac.com",
    phone: "(614) 555-0103",
    company: "Midwest HVAC Solutions",
    bio: "EPA-certified HVAC technician and inspector. 20+ years in the field. Expert in winterization and system diagnostics.",
    city: "Columbus", state: "OH", zipCode: "43215",
    latitude: 39.9612, longitude: -82.9988,
    availability: "BUSY", rating: 4.7, reviewCount: 203, hourlyRate: 135,
    specialties: [
      { specialty: "HVAC", yearsExp: 22, certified: true },
      { specialty: "GENERAL", yearsExp: 10, certified: false },
    ],
  },
  {
    name: "Jennifer Martinez",
    email: "jmartinez@roofcheck.org",
    phone: "(713) 555-0104",
    company: "RoofCheck Inspections",
    bio: "HAAG-certified roof inspector. Drone-assisted inspections for multi-story properties. Storm damage specialist.",
    city: "Houston", state: "TX", zipCode: "77002",
    latitude: 29.7604, longitude: -95.3698,
    availability: "AVAILABLE", rating: 4.9, reviewCount: 167, hourlyRate: 175,
    specialties: [
      { specialty: "ROOFER", yearsExp: 14, certified: true },
      { specialty: "STRUCTURAL", yearsExp: 8, certified: true },
    ],
  },
  {
    name: "David Thompson",
    email: "dthompson@pestguard.com",
    phone: "(404) 555-0105",
    company: "PestGuard Southeast",
    bio: "Licensed pest control operator with WDO inspection certification. Termite, mold, and environmental hazard specialist.",
    city: "Atlanta", state: "GA", zipCode: "30303",
    latitude: 33.7490, longitude: -84.3880,
    availability: "AVAILABLE", rating: 4.6, reviewCount: 89, hourlyRate: 110,
    specialties: [
      { specialty: "PEST_CONTROL", yearsExp: 16, certified: true },
      { specialty: "ENVIRONMENTAL", yearsExp: 10, certified: true },
    ],
  },
  {
    name: "Amanda Foster",
    email: "afoster@structint.com",
    phone: "(317) 555-0106",
    company: "Structural Integrity Inspections",
    bio: "Professional structural engineer and licensed inspector. Foundation, framing, and load-bearing assessment expert.",
    city: "Indianapolis", state: "IN", zipCode: "46204",
    latitude: 39.7684, longitude: -86.1581,
    availability: "BUSY", rating: 4.8, reviewCount: 134, hourlyRate: 200,
    specialties: [
      { specialty: "STRUCTURAL", yearsExp: 20, certified: true },
      { specialty: "GENERAL", yearsExp: 15, certified: true },
    ],
  },
  {
    name: "Carlos Rivera",
    email: "crivera@envirocheck.net",
    phone: "(480) 555-0107",
    company: "EnviroCheck Southwest",
    bio: "Environmental assessor specializing in desert climate properties. Mold, asbestos, and lead paint testing certified.",
    city: "Phoenix", state: "AZ", zipCode: "85004",
    latitude: 33.4484, longitude: -112.0740,
    availability: "AVAILABLE", rating: 4.5, reviewCount: 76, hourlyRate: 140,
    specialties: [
      { specialty: "ENVIRONMENTAL", yearsExp: 12, certified: true },
      { specialty: "GENERAL", yearsExp: 8, certified: false },
    ],
  },
  {
    name: "Michael O'Brien",
    email: "mobrien@septicpro.com",
    phone: "(720) 555-0108",
    company: "SepticPro Colorado",
    bio: "Certified septic system inspector with 15 years of rural property experience. Well water testing also available.",
    city: "Denver", state: "CO", zipCode: "80202",
    latitude: 39.7392, longitude: -104.9903,
    availability: "AVAILABLE", rating: 4.4, reviewCount: 61, hourlyRate: 120,
    specialties: [
      { specialty: "SEPTIC", yearsExp: 15, certified: true },
      { specialty: "WELL", yearsExp: 10, certified: true },
    ],
  },
  {
    name: "Lisa Park",
    email: "lpark@poolinspects.com",
    phone: "(702) 555-0109",
    company: "Pool Inspect LV",
    bio: "CPO-certified pool and spa inspector. Equipment evaluation, safety compliance, and pre-sale inspections.",
    city: "Las Vegas", state: "NV", zipCode: "89101",
    latitude: 36.1699, longitude: -115.1398,
    availability: "UNAVAILABLE", rating: 4.3, reviewCount: 44, hourlyRate: 100,
    specialties: [
      { specialty: "POOL", yearsExp: 8, certified: true },
      { specialty: "GENERAL", yearsExp: 5, certified: false },
    ],
  },
  {
    name: "James Washington",
    email: "jwashington@firesafeinspects.com",
    phone: "(313) 555-0110",
    company: "FireSafe Michigan",
    bio: "Former firefighter turned fire safety inspector. Sprinkler systems, alarms, and egress compliance specialist.",
    city: "Detroit", state: "MI", zipCode: "48226",
    latitude: 42.3314, longitude: -83.0458,
    availability: "AVAILABLE", rating: 4.7, reviewCount: 108, hourlyRate: 130,
    specialties: [
      { specialty: "FIRE_SAFETY", yearsExp: 18, certified: true },
      { specialty: "ELECTRICIAN", yearsExp: 10, certified: true },
    ],
  },
  {
    name: "Emily Watson",
    email: "ewatson@generalinspects.com",
    phone: "(615) 555-0111",
    company: "Nashville Home Inspectors",
    bio: "ASHI-certified home inspector. Comprehensive residential inspections including HUD and FHA requirements.",
    city: "Nashville", state: "TN", zipCode: "37203",
    latitude: 36.1627, longitude: -86.7816,
    availability: "AVAILABLE", rating: 4.6, reviewCount: 92, hourlyRate: 115,
    specialties: [
      { specialty: "GENERAL", yearsExp: 11, certified: true },
      { specialty: "PEST_CONTROL", yearsExp: 6, certified: false },
    ],
  },
  {
    name: "Daniel Kim",
    email: "dkim@hvacexperts.com",
    phone: "(503) 555-0112",
    company: "HVAC Experts NW",
    bio: "NATE-certified HVAC inspector. Heat pump, furnace, and ductwork evaluation. Energy audit specialist.",
    city: "Portland", state: "OR", zipCode: "97201",
    latitude: 45.5152, longitude: -122.6784,
    availability: "BUSY", rating: 4.8, reviewCount: 115, hourlyRate: 145,
    specialties: [
      { specialty: "HVAC", yearsExp: 14, certified: true },
      { specialty: "ENVIRONMENTAL", yearsExp: 7, certified: false },
    ],
  },
  {
    name: "Rachel Green",
    email: "rgreen@plumbingnw.com",
    phone: "(206) 555-0113",
    company: "Pacific NW Plumbing Inspections",
    bio: "Licensed plumber and inspector. Sewer scope, backflow testing, and water heater inspections. Quick turnaround guaranteed.",
    city: "Seattle", state: "WA", zipCode: "98101",
    latitude: 47.6062, longitude: -122.3321,
    availability: "AVAILABLE", rating: 4.5, reviewCount: 78, hourlyRate: 130,
    specialties: [
      { specialty: "PLUMBER", yearsExp: 13, certified: true },
      { specialty: "SEPTIC", yearsExp: 6, certified: false },
    ],
  },
  {
    name: "Kevin Murphy",
    email: "kmurphy@roofriders.com",
    phone: "(916) 555-0114",
    company: "California Roof Riders",
    bio: "Licensed roofing contractor and inspector. Specializing in tile, flat roof, and solar panel integration assessments.",
    city: "Denver", state: "CO", zipCode: "80203",
    latitude: 39.7392, longitude: -104.9903,
    availability: "AVAILABLE", rating: 4.4, reviewCount: 55, hourlyRate: 160,
    specialties: [
      { specialty: "ROOFER", yearsExp: 16, certified: true },
      { specialty: "GENERAL", yearsExp: 10, certified: false },
    ],
  },
  {
    name: "Nicole Adams",
    email: "nadams@wellwaterpro.com",
    phone: "(804) 555-0115",
    company: "Well Water Pro VA",
    bio: "Certified well inspector and water quality tester. Serving rural Virginia and surrounding areas.",
    city: "Charlotte", state: "NC", zipCode: "28202",
    latitude: 35.2271, longitude: -80.8431,
    availability: "AVAILABLE", rating: 4.3, reviewCount: 42, hourlyRate: 95,
    specialties: [
      { specialty: "WELL", yearsExp: 9, certified: true },
      { specialty: "ENVIRONMENTAL", yearsExp: 5, certified: true },
    ],
  },
  {
    name: "Anthony Brooks",
    email: "abrooks@structeng.com",
    phone: "(504) 555-0116",
    company: "Gulf South Structural",
    bio: "Licensed structural engineer specializing in hurricane damage assessment and flood zone compliance.",
    city: "New Orleans", state: "LA", zipCode: "70112",
    latitude: 29.9511, longitude: -90.0715,
    availability: "BUSY", rating: 4.9, reviewCount: 156, hourlyRate: 195,
    specialties: [
      { specialty: "STRUCTURAL", yearsExp: 22, certified: true },
      { specialty: "ENVIRONMENTAL", yearsExp: 12, certified: true },
    ],
  },
  {
    name: "Stephanie Cruz",
    email: "scruz@pestfreela.com",
    phone: "(213) 555-0117",
    company: "Pest-Free LA",
    bio: "Licensed pest control inspector for Los Angeles County. Termite, rodent, and bed bug inspection specialist.",
    city: "Las Vegas", state: "NV", zipCode: "89102",
    latitude: 36.1699, longitude: -115.1398,
    availability: "AVAILABLE", rating: 4.6, reviewCount: 87, hourlyRate: 105,
    specialties: [
      { specialty: "PEST_CONTROL", yearsExp: 10, certified: true },
      { specialty: "GENERAL", yearsExp: 5, certified: false },
    ],
  },
  {
    name: "Brian Taylor",
    email: "btaylor@electricinspects.com",
    phone: "(469) 555-0118",
    company: "Texas Electric Inspectors",
    bio: "Master electrician and inspector. Panel upgrades, GFCI compliance, and aluminum wiring assessments.",
    city: "Dallas", state: "TX", zipCode: "75201",
    latitude: 32.7767, longitude: -96.7970,
    availability: "AVAILABLE", rating: 4.7, reviewCount: 103, hourlyRate: 140,
    specialties: [
      { specialty: "ELECTRICIAN", yearsExp: 17, certified: true },
      { specialty: "FIRE_SAFETY", yearsExp: 8, certified: true },
    ],
  },
  {
    name: "Maria Gonzalez",
    email: "mgonzalez@swfloridainspects.com",
    phone: "(239) 555-0119",
    company: "SW Florida Inspections",
    bio: "Comprehensive home inspector serving Lee and Collier counties. Wind mitigation and 4-point inspection specialist.",
    city: "Charlotte", state: "NC", zipCode: "28203",
    latitude: 35.2271, longitude: -80.8431,
    availability: "AVAILABLE", rating: 4.5, reviewCount: 69, hourlyRate: 120,
    specialties: [
      { specialty: "GENERAL", yearsExp: 13, certified: true },
      { specialty: "ROOFER", yearsExp: 8, certified: true },
    ],
  },
  {
    name: "Christopher Lee",
    email: "clee@poolspaexperts.com",
    phone: "(813) 555-0120",
    company: "Pool & Spa Experts FL",
    bio: "CPO and CPI certified. Pool equipment, safety barrier, and chemical balance inspections for property managers.",
    city: "Charlotte", state: "NC", zipCode: "28204",
    latitude: 35.2271, longitude: -80.8431,
    availability: "UNAVAILABLE", rating: 4.2, reviewCount: 38, hourlyRate: 90,
    specialties: [
      { specialty: "POOL", yearsExp: 7, certified: true },
      { specialty: "PLUMBER", yearsExp: 4, certified: false },
    ],
  },
  {
    name: "Patricia Hall",
    email: "phall@hvacrural.com",
    phone: "(405) 555-0121",
    company: "Rural HVAC Services",
    bio: "HVAC specialist for rural and semi-rural properties. Propane, oil, and electric system expertise.",
    city: "Charlotte", state: "NC", zipCode: "28205",
    latitude: 35.2271, longitude: -80.8431,
    availability: "AVAILABLE", rating: 4.4, reviewCount: 52, hourlyRate: 110,
    specialties: [
      { specialty: "HVAC", yearsExp: 11, certified: true },
      { specialty: "GENERAL", yearsExp: 8, certified: false },
    ],
  },
  {
    name: "Andrew Scott",
    email: "ascott@septicsolutions.com",
    phone: "(859) 555-0122",
    company: "Septic Solutions KY",
    bio: "Certified septic installer and inspector. Tank pumping coordination, drain field evaluation, and compliance testing.",
    city: "Charlotte", state: "NC", zipCode: "28206",
    latitude: 35.2271, longitude: -80.8431,
    availability: "AVAILABLE", rating: 4.6, reviewCount: 71, hourlyRate: 115,
    specialties: [
      { specialty: "SEPTIC", yearsExp: 14, certified: true },
      { specialty: "WELL", yearsExp: 8, certified: true },
    ],
  },
  {
    name: "Rebecca Turner",
    email: "rturner@firesafeinspects.com",
    phone: "(919) 555-0123",
    company: "FireSafe Carolinas",
    bio: "Fire safety and life safety code inspector. Commercial and residential sprinkler, alarm, and egress evaluations.",
    city: "Raleigh", state: "NC", zipCode: "27601",
    latitude: 35.7796, longitude: -78.6382,
    availability: "AVAILABLE", rating: 4.7, reviewCount: 95, hourlyRate: 135,
    specialties: [
      { specialty: "FIRE_SAFETY", yearsExp: 15, certified: true },
      { specialty: "STRUCTURAL", yearsExp: 8, certified: false },
    ],
  },
  {
    name: "Jason Nguyen",
    email: "jnguyen@envirotestpdx.com",
    phone: "(503) 555-0124",
    company: "EnviroTest Portland",
    bio: "Environmental testing professional. Radon, mold, asbestos, and lead paint testing for residential properties.",
    city: "Portland", state: "OR", zipCode: "97202",
    latitude: 45.5152, longitude: -122.6784,
    availability: "AVAILABLE", rating: 4.5, reviewCount: 63, hourlyRate: 125,
    specialties: [
      { specialty: "ENVIRONMENTAL", yearsExp: 11, certified: true },
      { specialty: "GENERAL", yearsExp: 6, certified: false },
    ],
  },
  {
    name: "Tanya Wright",
    email: "twright@generalinspects.com",
    phone: "(901) 555-0125",
    company: "Memphis Home Inspectors",
    bio: "HUD-certified 203(k) consultant and home inspector. REO and foreclosure specialist with bank-ready reporting.",
    city: "Memphis", state: "TN", zipCode: "38103",
    latitude: 35.1495, longitude: -90.0490,
    availability: "BUSY", rating: 4.8, reviewCount: 119, hourlyRate: 145,
    specialties: [
      { specialty: "GENERAL", yearsExp: 16, certified: true },
      { specialty: "STRUCTURAL", yearsExp: 10, certified: true },
      { specialty: "PEST_CONTROL", yearsExp: 8, certified: true },
    ],
  },
  {
    name: "Gregory Palmer",
    email: "gpalmerr@wellcheckservices.com",
    phone: "(603) 555-0126",
    company: "New England Well Check",
    bio: "Licensed well driller and inspector. Flow testing, water quality analysis, and well rehabilitation consulting.",
    city: "Portland", state: "OR", zipCode: "97203",
    latitude: 45.5152, longitude: -122.6784,
    availability: "AVAILABLE", rating: 4.3, reviewCount: 37, hourlyRate: 105,
    specialties: [
      { specialty: "WELL", yearsExp: 19, certified: true },
      { specialty: "ENVIRONMENTAL", yearsExp: 12, certified: true },
    ],
  },
  {
    name: "Michelle Davis",
    email: "mdavis@plumbinginspectors.com",
    phone: "(303) 555-0127",
    company: "Rocky Mountain Plumbing Inspections",
    bio: "Licensed plumber and backflow prevention specialist. Commercial and residential plumbing system evaluations.",
    city: "Denver", state: "CO", zipCode: "80204",
    latitude: 39.7392, longitude: -104.9903,
    availability: "AVAILABLE", rating: 4.6, reviewCount: 82, hourlyRate: 130,
    specialties: [
      { specialty: "PLUMBER", yearsExp: 14, certified: true },
      { specialty: "GENERAL", yearsExp: 8, certified: false },
    ],
  },
  {
    name: "Timothy Ross",
    email: "tross@electricmidwest.com",
    phone: "(314) 555-0128",
    company: "Midwest Electric Inspectors",
    bio: "Licensed electrician specializing in older Midwest homes. Knob-and-tube wiring assessments and upgrade planning.",
    city: "St. Louis", state: "MO", zipCode: "63101",
    latitude: 38.6270, longitude: -90.1994,
    availability: "AVAILABLE", rating: 4.4, reviewCount: 58, hourlyRate: 120,
    specialties: [
      { specialty: "ELECTRICIAN", yearsExp: 15, certified: true },
      { specialty: "FIRE_SAFETY", yearsExp: 7, certified: false },
    ],
  },
];

// ─── Supplier Seed Data ──────────────────────────────────────────────────────

const SUPPLIERS = [
  {
    name: "HomeDepot Pro",
    contact: "Jake Morrison",
    email: "pro@homedepot.com",
    phone: "(800) 555-0201",
    address: "2455 Paces Ferry Rd SE, Atlanta, GA 30339",
    categories: ["Hardware", "Board-Up", "Lawn Care", "Plumbing", "Electrical", "Safety", "Cleaning"],
    rating: 4.5, leadTime: "1-2 days",
    notes: "Bulk pricing available for orders over $500. Free delivery on orders over $250.",
  },
  {
    name: "Lowe's Commercial",
    contact: "Sarah Mitchell",
    email: "commercial@lowes.com",
    phone: "(800) 555-0202",
    address: "1000 Lowes Blvd, Mooresville, NC 28117",
    categories: ["Hardware", "Board-Up", "Lawn Care", "Plumbing", "Electrical", "Cleaning"],
    rating: 4.3, leadTime: "1-3 days",
    notes: "Commercial account with net-30 terms. Dedicated account rep assigned.",
  },
  {
    name: "ABC Supply Co.",
    contact: "Mike Henderson",
    email: "orders@abcsupply.com",
    phone: "(800) 555-0203",
    address: "1200 American Blvd, Memphis, TN 38118",
    categories: ["Board-Up", "Hardware", "Safety"],
    rating: 4.7, leadTime: "Same day",
    notes: "Best for roofing and board-up materials. Priority delivery for property preservation companies.",
  },
  {
    name: "Grainger Industrial",
    contact: "Diana Kowalski",
    email: "sales@grainger.com",
    phone: "(800) 555-0204",
    address: "100 Grainger Pkwy, Lake Forest, IL 60045",
    categories: ["Safety", "Hardware", "Electrical", "Cleaning"],
    rating: 4.6, leadTime: "Next day",
    notes: "Excellent for safety equipment and PPE. 24/7 emergency ordering available.",
  },
  {
    name: "SiteOne Landscape Supply",
    contact: "Chris Bowman",
    email: "info@siteone.com",
    phone: "(800) 555-0205",
    address: "300 Colonial Center Pkwy, Roswell, GA 30076",
    categories: ["Lawn Care", "Hardware"],
    rating: 4.4, leadTime: "1-2 days",
    notes: "Specialist in lawn and landscape products. Seasonal bulk discounts.",
  },
  {
    name: "Ferguson Enterprises",
    contact: "Robert Chang",
    email: "pro@ferguson.com",
    phone: "(800) 555-0206",
    address: "751 Lakefront Commons, Newport News, VA 23606",
    categories: ["Plumbing", "Hardware", "Winterization"],
    rating: 4.5, leadTime: "1-2 days",
    notes: "Top plumbing supplier. Winterization kits and supplies available year-round.",
  },
  {
    name: "Fastenal Company",
    contact: "Jennifer Lyons",
    email: "orders@fastenal.com",
    phone: "(800) 555-0207",
    address: "2001 Theurer Blvd, Winona, MN 55987",
    categories: ["Hardware", "Safety", "Electrical"],
    rating: 4.3, leadTime: "Same day",
    notes: "Vending machines available at job sites. Next-day delivery on most items.",
  },
  {
    name: "Uline Shipping Supplies",
    contact: "Tom Bradley",
    email: "sales@uline.com",
    phone: "(800) 555-0208",
    address: "12575 Uline Dr, Pleasant Prairie, WI 53158",
    categories: ["Cleaning", "Safety", "Board-Up"],
    rating: 4.4, leadTime: "Next day",
    notes: "Cleaning supplies, safety gear, and packaging materials. Same-day shipping on in-stock items.",
  },
  {
    name: "Pool Corp / SCP Distributors",
    contact: "Amanda Reed",
    email: "orders@poolcorp.com",
    phone: "(800) 555-0209",
    address: "109 Northpark Blvd, Covington, LA 70433",
    categories: ["Pool", "Plumbing"],
    rating: 4.2, leadTime: "2-3 days",
    notes: "Pool chemicals, equipment, and parts. Bulk pricing for commercial accounts.",
  },
  {
    name: "Everbilt (Home Depot Brand)",
    contact: "Kevin Marsh",
    email: "everbilt@homedepot.com",
    phone: "(800) 555-0210",
    address: "2455 Paces Ferry Rd SE, Atlanta, GA 30339",
    categories: ["Hardware", "Plumbing", "Electrical", "Winterization"],
    rating: 4.1, leadTime: "1-2 days",
    notes: "Budget-friendly hardware and plumbing parts. Good for high-volume property preservation.",
  },
  {
    name: "Sherwin-Williams Commercial",
    contact: "Nancy Patel",
    email: "commercial@sherwin.com",
    phone: "(800) 555-0211",
    address: "101 W Prospect Ave, Cleveland, OH 44115",
    categories: ["Cleaning", "Hardware"],
    rating: 4.6, leadTime: "Same day",
    notes: "Paint, primers, and cleaning chemicals. Contractor pricing with volume discounts.",
  },
  {
    name: "W.W. Grainger Safety",
    contact: "Larry Foster",
    email: "safety@grainger.com",
    phone: "(800) 555-0212",
    address: "100 Grainger Pkwy, Lake Forest, IL 60045",
    categories: ["Safety", "Cleaning"],
    rating: 4.5, leadTime: "Next day",
    notes: "PPE, respirators, hazmat suits, and safety signage. OSHA compliance products.",
  },
];

// ─── Material Seed Data ──────────────────────────────────────────────────────

interface MaterialSeed {
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  quantity: number;
  minStock: number;
  location: string;
  supplierName: string;
}

const MATERIALS: MaterialSeed[] = [
  // Hardware
  { name: "Plywood 4x8 (3/4\")", category: "Board-Up", unit: "sheet", unitCost: 42.99, quantity: 120, minStock: 30, location: "Warehouse A", supplierName: "HomeDepot Pro" },
  { name: "Plywood 4x8 (1/2\")", category: "Board-Up", unit: "sheet", unitCost: 32.99, quantity: 85, minStock: 25, location: "Warehouse A", supplierName: "ABC Supply Co." },
  { name: "2x4 Lumber (8ft)", category: "Board-Up", unit: "piece", unitCost: 5.49, quantity: 200, minStock: 50, location: "Warehouse A", supplierName: "HomeDepot Pro" },
  { name: "Deck Screws (1lb box)", category: "Hardware", unit: "box", unitCost: 8.99, quantity: 45, minStock: 20, location: "Warehouse B", supplierName: "Fastenal Company" },
  { name: "Drywall Screws (5lb)", category: "Hardware", unit: "box", unitCost: 18.99, quantity: 30, minStock: 15, location: "Warehouse B", supplierName: "Fastenal Company" },
  { name: "Exterior Wood Screws (1lb)", category: "Hardware", unit: "box", unitCost: 12.49, quantity: 8, minStock: 15, location: "Warehouse B", supplierName: "Fastenal Company" },
  { name: "Padlocks (Keyed Alike)", category: "Hardware", unit: "each", unitCost: 14.99, quantity: 60, minStock: 25, location: "Warehouse A", supplierName: "Grainger Industrial" },
  { name: "Combination Lock", category: "Hardware", unit: "each", unitCost: 9.99, quantity: 40, minStock: 20, location: "Warehouse A", supplierName: "Grainger Industrial" },
  { name: "Door Knob (Keyed Entry)", category: "Hardware", unit: "each", unitCost: 24.99, quantity: 35, minStock: 15, location: "Warehouse B", supplierName: "HomeDepot Pro" },

  // Lawn Care
  { name: "String Trimmer Line", category: "Lawn Care", unit: "spool", unitCost: 12.99, quantity: 25, minStock: 10, location: "Warehouse C", supplierName: "SiteOne Landscape Supply" },
  { name: "Push Mower (Commercial)", category: "Lawn Care", unit: "each", unitCost: 389.99, quantity: 4, minStock: 2, location: "Warehouse C", supplierName: "SiteOne Landscape Supply" },
  { name: "Leaf Bags (Box of 50)", category: "Lawn Care", unit: "box", unitCost: 15.99, quantity: 12, minStock: 8, location: "Warehouse C", supplierName: "SiteOne Landscape Supply" },
  { name: "Hedge Trimmer", category: "Lawn Care", unit: "each", unitCost: 89.99, quantity: 6, minStock: 3, location: "Warehouse C", supplierName: "HomeDepot Pro" },
  { name: "Gasoline (5 gal can)", category: "Lawn Care", unit: "each", unitCost: 19.99, quantity: 8, minStock: 5, location: "Warehouse C", supplierName: "HomeDepot Pro" },

  // Plumbing
  { name: "PVC Pipe 3/4\" (10ft)", category: "Plumbing", unit: "piece", unitCost: 4.99, quantity: 50, minStock: 20, location: "Warehouse B", supplierName: "Ferguson Enterprises" },
  { name: "PVC Couplings 3/4\"", category: "Plumbing", unit: "bag", unitCost: 6.99, quantity: 30, minStock: 10, location: "Warehouse B", supplierName: "Ferguson Enterprises" },
  { name: "Toilet Wax Ring", category: "Plumbing", unit: "each", unitCost: 5.49, quantity: 25, minStock: 10, location: "Warehouse B", supplierName: "Ferguson Enterprises" },
  { name: "Faucet (Kitchen Standard)", category: "Plumbing", unit: "each", unitCost: 79.99, quantity: 8, minStock: 5, location: "Warehouse B", supplierName: "Ferguson Enterprises" },
  { name: "Water Heater Element", category: "Plumbing", unit: "each", unitCost: 24.99, quantity: 4, minStock: 6, location: "Warehouse B", supplierName: "Ferguson Enterprises" },
  { name: "Antifreeze (Winterization)", category: "Winterization", unit: "gallon", unitCost: 8.99, quantity: 40, minStock: 20, location: "Warehouse A", supplierName: "Everbilt (Home Depot Brand)" },
  { name: "Pipe Insulation (6ft)", category: "Winterization", unit: "piece", unitCost: 3.99, quantity: 5, minStock: 15, location: "Warehouse A", supplierName: "Everbilt (Home Depot Brand)" },

  // Electrical
  { name: "Wire Nuts (Assorted Box)", category: "Electrical", unit: "box", unitCost: 11.99, quantity: 20, minStock: 10, location: "Warehouse B", supplierName: "Grainger Industrial" },
  { name: "Electrical Tape (10-pack)", category: "Electrical", unit: "pack", unitCost: 14.99, quantity: 15, minStock: 8, location: "Warehouse B", supplierName: "Fastenal Company" },
  { name: "GFCI Outlet", category: "Electrical", unit: "each", unitCost: 18.99, quantity: 30, minStock: 12, location: "Warehouse B", supplierName: "HomeDepot Pro" },
  { name: "Circuit Breaker 20A", category: "Electrical", unit: "each", unitCost: 12.99, quantity: 3, minStock: 10, location: "Warehouse B", supplierName: "Grainger Industrial" },
  { name: "Light Bulbs (LED 4-pack)", category: "Electrical", unit: "pack", unitCost: 9.99, quantity: 25, minStock: 10, location: "Warehouse A", supplierName: "HomeDepot Pro" },

  // Safety
  { name: "N95 Respirators (Box of 20)", category: "Safety", unit: "box", unitCost: 24.99, quantity: 18, minStock: 10, location: "Warehouse A", supplierName: "W.W. Grainger Safety" },
  { name: "Safety Glasses (12-pack)", category: "Safety", unit: "pack", unitCost: 19.99, quantity: 10, minStock: 5, location: "Warehouse A", supplierName: "Grainger Industrial" },
  { name: "Work Gloves (Leather, 12-pack)", category: "Safety", unit: "pack", unitCost: 39.99, quantity: 8, minStock: 5, location: "Warehouse A", supplierName: "W.W. Grainger Safety" },
  { name: "Hard Hats (Box of 6)", category: "Safety", unit: "box", unitCost: 54.99, quantity: 4, minStock: 2, location: "Warehouse A", supplierName: "W.W. Grainger Safety" },
  { name: "Caution Tape (1000ft)", category: "Safety", unit: "roll", unitCost: 7.99, quantity: 15, minStock: 8, location: "Warehouse A", supplierName: "Uline Shipping Supplies" },
  { name: "Fire Extinguisher (5lb ABC)", category: "Safety", unit: "each", unitCost: 49.99, quantity: 6, minStock: 4, location: "Warehouse A", supplierName: "Grainger Industrial" },

  // Cleaning
  { name: "Bleach (Gallon)", category: "Cleaning", unit: "gallon", unitCost: 4.99, quantity: 30, minStock: 15, location: "Warehouse C", supplierName: "Sherwin-Williams Commercial" },
  { name: "All-Purpose Cleaner (Gallon)", category: "Cleaning", unit: "gallon", unitCost: 12.99, quantity: 20, minStock: 10, location: "Warehouse C", supplierName: "Uline Shipping Supplies" },
  { name: "Heavy-Duty Trash Bags (Box)", category: "Cleaning", unit: "box", unitCost: 22.99, quantity: 15, minStock: 8, location: "Warehouse C", supplierName: "Uline Shipping Supplies" },
  { name: "Mop & Bucket Set", category: "Cleaning", unit: "set", unitCost: 29.99, quantity: 10, minStock: 5, location: "Warehouse C", supplierName: "Uline Shipping Supplies" },
  { name: "Shop Vac (6 Gallon)", category: "Cleaning", unit: "each", unitCost: 79.99, quantity: 5, minStock: 3, location: "Warehouse C", supplierName: "HomeDepot Pro" },

  // Pool
  { name: "Chlorine Tabs (50lb bucket)", category: "Pool", unit: "bucket", unitCost: 89.99, quantity: 6, minStock: 3, location: "Warehouse C", supplierName: "Pool Corp / SCP Distributors" },
  { name: "Pool Shock (24-pack)", category: "Pool", unit: "pack", unitCost: 34.99, quantity: 8, minStock: 4, location: "Warehouse C", supplierName: "Pool Corp / SCP Distributors" },
  { name: "Pool Pump Motor", category: "Pool", unit: "each", unitCost: 249.99, quantity: 2, minStock: 1, location: "Warehouse C", supplierName: "Pool Corp / SCP Distributors" },
];

// ─── Purchase Order Seed Data ────────────────────────────────────────────────

const ORDER_STATUSES = ["PENDING", "ORDERED", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const;

// ─── Main Seed Function ──────────────────────────────────────────────────────

export async function seedInspectorsAndLogistics() {
  const companies = await prisma.company.findMany();
  if (companies.length === 0) {
    console.warn("  ⚠️ No companies found to seed inspectors and logistics.");
    return;
  }
  const getCompanyId = (i: number) => companies[i % companies.length].id;

  console.log("  📋 Seeding inspectors...");

  // Create inspectors
  let idx = 0;
  for (const data of INSPECTORS) {
    const existing = await prisma.inspector.findFirst({ where: { email: data.email } });
    if (existing) {
      idx++;
      continue;
    }

    await prisma.inspector.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        bio: data.bio,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        latitude: data.latitude,
        longitude: data.longitude,
        availability: data.availability,
        rating: data.rating,
        reviewCount: data.reviewCount,
        hourlyRate: data.hourlyRate,
        companyId: getCompanyId(idx),
        specialties: {
          create: data.specialties.map((s) => ({
            specialty: s.specialty as any,
            yearsExp: s.yearsExp,
            certified: s.certified,
          })),
        },
      },
    });
    idx++;
  }

  const inspectorCount = await prisma.inspector.count();
  console.log(`  ✅ ${INSPECTORS.length} inspectors seeded (${inspectorCount} total)`);

  // ─── Suppliers ───
  console.log("  📋 Seeding suppliers...");

  const supplierMap: Record<string, string> = {}; // name -> id
  const supplierCompanyMap: Record<string, string> = {}; // name -> companyId

  let sIdx = 0;
  for (const data of SUPPLIERS) {
    const compId = getCompanyId(sIdx);
    const existing = await prisma.supplier.findFirst({ where: { name: data.name } });
    if (existing) {
      supplierMap[data.name] = existing.id;
      supplierCompanyMap[data.name] = existing.companyId || compId;
      sIdx++;
      continue;
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        contact: data.contact,
        email: data.email,
        phone: data.phone,
        address: data.address,
        categories: JSON.stringify(data.categories),
        rating: data.rating,
        leadTime: data.leadTime,
        notes: data.notes,
        companyId: compId,
      },
    });
    supplierMap[data.name] = supplier.id;
    supplierCompanyMap[data.name] = compId;
    sIdx++;
  }

  const supplierCount = await prisma.supplier.count();
  console.log(`  ✅ ${SUPPLIERS.length} suppliers seeded (${supplierCount} total)`);

  // ─── Materials ───
  console.log("  📋 Seeding materials...");

  const materialMap: Record<string, string> = {}; // name -> id

  let mIdx = 0;
  for (const data of MATERIALS) {
    const existing = await prisma.material.findFirst({ where: { name: data.name } });
    if (existing) {
      materialMap[data.name] = existing.id;
      mIdx++;
      continue;
    }

    const supplierId = supplierMap[data.supplierName] || null;
    const compId = supplierId ? supplierCompanyMap[data.supplierName] : getCompanyId(mIdx);

    const material = await prisma.material.create({
      data: {
        name: data.name,
        category: data.category,
        unit: data.unit,
        unitCost: data.unitCost,
        quantity: data.quantity,
        minStock: data.minStock,
        location: data.location,
        supplierId,
        companyId: compId,
      },
    });
    materialMap[data.name] = material.id;
    mIdx++;
  }

  const materialCount = await prisma.material.count();
  console.log(`  ✅ ${MATERIALS.length} materials seeded (${materialCount} total)`);

  // ─── Purchase Orders ───
  console.log("  📋 Seeding purchase orders...");

  const materialNames = Object.keys(materialMap);
  const supplierNames = Object.keys(supplierMap);

  const orderDefs = [
    { status: "PENDING", daysAgo: 1, itemCount: 3 },
    { status: "PENDING", daysAgo: 0, itemCount: 2 },
    { status: "ORDERED", daysAgo: 3, itemCount: 4 },
    { status: "ORDERED", daysAgo: 5, itemCount: 2 },
    { status: "ORDERED", daysAgo: 2, itemCount: 3 },
    { status: "IN_TRANSIT", daysAgo: 4, itemCount: 5 },
    { status: "IN_TRANSIT", daysAgo: 6, itemCount: 2 },
    { status: "IN_TRANSIT", daysAgo: 3, itemCount: 3 },
    { status: "DELIVERED", daysAgo: 10, itemCount: 4 },
    { status: "DELIVERED", daysAgo: 8, itemCount: 3 },
    { status: "DELIVERED", daysAgo: 15, itemCount: 2 },
    { status: "DELIVERED", daysAgo: 12, itemCount: 5 },
    { status: "CANCELLED", daysAgo: 7, itemCount: 2 },
    { status: "CANCELLED", daysAgo: 4, itemCount: 3 },
    { status: "PENDING", daysAgo: 0, itemCount: 4 },
    { status: "IN_TRANSIT", daysAgo: 5, itemCount: 3 },
    { status: "DELIVERED", daysAgo: 20, itemCount: 4 },
  ];

  const existingOrders = await prisma.purchaseOrder.count();
  let orderNum = existingOrders + 1;

  for (const def of orderDefs) {
    const supName = pick(supplierNames);
    const supplierId = supplierMap[supName];
    const compId = supplierCompanyMap[supName];
    const items: { materialName: string; quantity: number; unitCost: number; total: number; materialId: string | null }[] = [];
    let subtotal = 0;

    for (let i = 0; i < def.itemCount; i++) {
      const matName = pick(materialNames);
      const mat = await prisma.material.findFirst({ where: { name: matName } });
      const qty = randInt(2, 20);
      const unitCost = mat?.unitCost || randFloat(5, 100);
      const total = Math.round(qty * unitCost * 100) / 100;
      subtotal += total;
      items.push({
        materialName: matName,
        quantity: qty,
        unitCost,
        total,
        materialId: mat?.id || null,
      });
    }

    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const orderNumber = `PO-2026-${String(orderNum).padStart(3, "0")}`;
    orderNum++;

    await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        status: def.status as any,
        subtotal,
        tax,
        total,
        companyId: compId,
        notes: pick([
          "Rush order - needed for upcoming jobs",
          "Standard reorder for low stock items",
          "Bulk order for Q2 projects",
          "Replacement for damaged materials",
          "Seasonal prep order",
          "",
        ]),
        orderedAt: daysFromNow(-def.daysAgo),
        expectedDelivery: daysFromNow(-def.daysAgo + 3),
        deliveredAt: def.status === "DELIVERED" ? daysFromNow(-def.daysAgo + randInt(2, 5)) : null,
        items: { create: items },
      },
    });
  }

  const poCount = await prisma.purchaseOrder.count();
  console.log(`  ✅ ${orderDefs.length} purchase orders seeded (${poCount} total)`);
}

// Allow running independently
if (require.main === module) {
  seedInspectorsAndLogistics()
    .then(() => {
      console.log("\n🎉 Inspectors & Logistics seed completed!");
      return prisma.$disconnect();
    })
    .catch((e) => {
      console.error(e);
      return prisma.$disconnect().then(() => process.exit(1));
    });
}
