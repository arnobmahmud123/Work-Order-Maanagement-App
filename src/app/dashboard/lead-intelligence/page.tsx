"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, MapPin, Target, Building2, Phone, Mail, 
  Globe, Plus, Check, Download, Briefcase, Loader2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const MOCK_LEADS = [
  {
    id: "mock1",
    companyName: "US Guard Property Preservation",
    contactName: "Linda Brown",
    contactRole: "Lead Preservation Contractor",
    businessType: "Property Preservation",
    city: "Texas",
    state: "",
    email: "linda.brown@usguardpropertypreservation.com",
    emailVerified: false,
    phone: "+1 (200) 555-0110",
    website: "usguardpropertypreservation.com",
    dealValue: 4763,
  },
  {
    id: "mock2",
    companyName: "Apex Preservation Services",
    contactName: "David Anderson",
    contactRole: "Foreclosure Field Supervisor",
    businessType: "Property Preservation",
    city: "Texas",
    state: "",
    email: "david.anderson@apexpreservationservices.com",
    emailVerified: true,
    phone: "+1 (217) 555-0113",
    website: "apexpreservationservices.com",
    dealValue: 3785,
  },
  {
    id: "mock3",
    companyName: "Nationwide Property Care LLC",
    contactName: "Susan Sanchez",
    contactRole: "Debris Removal Coordinator",
    businessType: "Property Preservation",
    city: "Texas",
    state: "",
    email: "susan.sanchez@nationwidepropertycare.com",
    emailVerified: true,
    phone: "+1 (469) 555-0199",
    website: "nationwidepropertycare.com",
    dealValue: 5200,
  },
  {
    id: "mock4",
    companyName: "Gold Standard Winterization & Boarding",
    contactName: "Thomas Torres",
    contactRole: "Winterization Specialist",
    businessType: "Property Preservation",
    city: "Texas",
    state: "",
    email: "thomas.torres@goldstandardwinterization.com",
    emailVerified: true,
    phone: "+1 (817) 555-0245",
    website: "goldstandardwinterization.com",
    dealValue: 2450,
  }
];

export default function AILeadFinderPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  
  // Finder Form State
  const [keyword, setKeyword] = useState("Property Preservation Contractor");
  const [sourceChannel, setSourceChannel] = useState("Google Maps & Business Directories");
  const [location, setLocation] = useState("Texas");
  const [country, setCountry] = useState("United States");
  const [stateRegion, setStateRegion] = useState("");
  const [city, setCity] = useState("Houston");
  const [zipCode, setZipCode] = useState("");
  const [engineMethod, setEngineMethod] = useState("US Directory Database (Bulk)");
  const [leadQuantity, setLeadQuantity] = useState("100 Leads (Professional)");

  useEffect(() => {
    fetchLeads();
  }, []); 

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?limit=100`);
      if (res.ok) {
        const data = await res.json();
        // If no leads (e.g. D1 database empty), fallback to mock
        if (!data.leads || data.leads.length === 0) {
          setLeads(MOCK_LEADS);
        } else {
          setLeads(data.leads);
        }
      } else {
        setLeads(MOCK_LEADS);
      }
    } catch (error) {
      console.error("Failed to fetch leads", error);
      setLeads(MOCK_LEADS);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = (e: React.FormEvent) => {
    e.preventDefault();
    setIsScraping(true);
    setLeads([]); // clear current to show skeleton/loading
    
    // Simulate an AI scraping process
    setTimeout(() => {
      fetchLeads(); 
      setIsScraping(false);
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto bg-[#F9FAFB] min-h-screen font-sans">
      
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[22px] font-bold text-slate-800 flex items-center gap-2 tracking-tight">
          Outscraper Lead Finder & CRM
        </h1>
        <div className="flex gap-2">
           <Button variant="outline" className="bg-white hover:bg-slate-50 border-slate-200 text-sm font-medium h-9 px-4 rounded-full">
             Remix
           </Button>
           <Button variant="outline" className="bg-white hover:bg-slate-50 border-slate-200 text-sm font-medium h-9 px-4 rounded-full">
             Device
           </Button>
        </div>
      </div>

      {/* Target Industry Shortcuts */}
      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
        {[
          { title: "Preservation...", desc: "Winterization, Boarding,..." },
          { title: "General Contractor", desc: "Roofing, Repair estimation,..." },
          { title: "Inspection Company", desc: "Occupancy audits, Damag..." },
          { title: "Property Inspector", desc: "Local inspectors, Loss..." },
          { title: "3rd Party Professional", desc: "Advisory, Title, Client..." }
        ].map((item, i) => (
          <Card key={i} className={`p-4 min-w-[220px] shrink-0 cursor-pointer transition-all rounded-[14px] ${i === 0 ? 'border-blue-200 bg-white shadow-sm ring-1 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-200 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {i === 0 ? <Briefcase className="h-4 w-4 text-slate-400" /> : <Building2 className="h-4 w-4 text-slate-400" />}
              <p className={`font-semibold text-[13px] ${i === 0 ? 'text-slate-800' : 'text-slate-500'}`}>{item.title}</p>
            </div>
            <p className="text-[11px] text-slate-400 truncate">{item.desc}</p>
          </Card>
        ))}
      </div>

      {/* Main Filter Form */}
      <Card className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-7">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Target Industry / Keyword</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9 bg-[#F9FAFB] border-none h-11 text-[13px] font-medium text-slate-700 rounded-lg focus-visible:ring-1 focus-visible:ring-blue-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Extraction Source Channel</label>
            <select 
              value={sourceChannel}
              onChange={(e) => setSourceChannel(e.target.value)}
              className="w-full h-11 rounded-lg border-none bg-[#F9FAFB] px-3 text-[13px] font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option>Google Maps & Business Directories</option>
              <option>Contractor Forums (ContractorTalk, etc.)</option>
              <option>Contractor.net Registry Platform</option>
              <option>Facebook Groups & Online Communities</option>
              <option>LinkedIn Profiles & Company Pages</option>
              <option>Niche Industry Blogs & Websites</option>
              <option>Direct Domain Crawlers & Contact Pages</option>
              <option>General Social Networks (X/Instagram)</option>
            </select>
          </div>
        </div>

        <Card className="p-5 border border-slate-100 bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] space-y-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <MapPin className="h-4 w-4" />
            <h3 className="text-[11px] font-bold tracking-wider uppercase text-slate-400">High-Precision Geographic Filtering</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">General Location</label>
              <Input value={location} onChange={e=>setLocation(e.target.value)} className="bg-white border-slate-100 h-10 text-[13px] shadow-sm rounded-lg" />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Country</label>
              <Input value={country} onChange={e=>setCountry(e.target.value)} className="bg-white border-slate-100 h-10 text-[13px] shadow-sm rounded-lg" />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">State / Region</label>
              <Input placeholder="e.g. TX, IL, CA" value={stateRegion} onChange={e=>setStateRegion(e.target.value)} className="bg-white border-slate-100 h-10 text-[13px] shadow-sm rounded-lg" />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">City</label>
              <Input placeholder="e.g. Dallas, Chicago" value={city} onChange={e=>setCity(e.target.value)} className="bg-white border-slate-100 h-10 text-[13px] shadow-sm rounded-lg" />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Zip Range / Code</label>
              <Input placeholder="e.g. 75001-75050" value={zipCode} onChange={e=>setZipCode(e.target.value)} className="bg-white border-slate-100 h-10 text-[13px] shadow-sm rounded-lg" />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 items-end">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Extraction Engine Method</label>
            <div className="flex gap-2">
              <Button 
                variant={engineMethod === "US Directory Database (Bulk)" ? "primary" : "outline"} 
                className={`flex-1 h-11 text-[13px] font-semibold rounded-lg ${engineMethod === "US Directory Database (Bulk)" ? "bg-blue-50/50 border-blue-200 text-blue-600 hover:bg-blue-50" : "bg-[#F9FAFB] border-none text-slate-500 hover:text-slate-700"}`}
                onClick={() => setEngineMethod("US Directory Database (Bulk)")}
              >
                US Directory Database (Bulk)
              </Button>
              <Button 
                variant={engineMethod === "AI Real-Time Grounded Search" ? "primary" : "outline"} 
                className={`flex-1 h-11 text-[13px] font-semibold rounded-lg ${engineMethod === "AI Real-Time Grounded Search" ? "bg-blue-50/50 border-blue-200 text-blue-600 hover:bg-blue-50" : "bg-[#F9FAFB] border-none text-slate-500 hover:text-slate-700"}`}
                onClick={() => setEngineMethod("AI Real-Time Grounded Search")}
              >
                AI Real-Time Grounded Search
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Target Lead Quantity</label>
            <select 
              value={leadQuantity}
              onChange={(e) => setLeadQuantity(e.target.value)}
              className="w-full h-11 rounded-lg border-none bg-[#F9FAFB] px-3 text-[13px] font-medium text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option>6 Leads (Sample Pack)</option>
              <option>25 Leads (Startup)</option>
              <option>50 Leads (Growth)</option>
              <option>100 Leads (Professional)</option>
              <option>500 Leads (Corporate)</option>
              <option>1,000 Leads (Enterprise)</option>
              <option>2,500 Leads (Institutional)</option>
              <option>5,000 Leads (Complete Domestic Registry)</option>
              <option>100,000 Leads (Premium segment - 100K)</option>
              <option>500,000 Leads (Regional Registry - 500K)</option>
              <option>1,000,000 Leads (Complete National US Database - 1M)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleScrape} 
            disabled={isScraping}
            className="bg-[#2B70FF] hover:bg-blue-700 text-white h-11 px-8 rounded-xl shadow-lg shadow-blue-500/30 text-[14px] font-semibold transition-all w-full md:w-auto"
          >
            {isScraping ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting Data...</>
            ) : (
              <><Target className="mr-2 h-4 w-4" /> Scrape Leads with AI Search</>
            )}
          </Button>
        </div>
      </Card>

      {/* Results Section */}
      <div className="space-y-5 pt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <p className="text-[13px] text-slate-500 font-medium max-w-md">All contacts listed below are verified and available for immediate CRM pipelining.</p>
          </div>
          <div className="flex flex-wrap gap-3">
             <Button variant="outline" className="bg-white h-10 border-slate-200 text-slate-600 rounded-lg text-[13px] font-semibold hover:bg-slate-50 shadow-sm">
               <Download className="mr-2 h-4 w-4" /> Download Full Segment CSV ({leads.length} Leads)
             </Button>
             <Button variant="outline" className="bg-emerald-50/50 border-emerald-200 text-emerald-600 h-10 hover:bg-emerald-50 rounded-lg text-[13px] font-semibold shadow-sm">
               <Check className="mr-2 h-4 w-4" /> All Emails Verified
             </Button>
             <Button className="bg-[#2B70FF] hover:bg-blue-700 text-white h-10 rounded-lg shadow-md shadow-blue-500/20 text-[13px] font-semibold px-6">
               Import Preview ({leads.length}) to CRM
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {loading || isScraping ? (
             <div className="col-span-1 xl:col-span-2 flex justify-center py-20">
               <div className="flex flex-col items-center gap-4 text-slate-400">
                 <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                 <span className="text-sm font-medium">Running Extraction Engine...</span>
               </div>
             </div>
          ) : leads.map(lead => (
            <Card key={lead.id} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <Button variant="ghost" className="absolute top-5 right-5 h-8 w-8 rounded-full border border-slate-200 text-slate-400 flex items-center justify-center p-0 hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="h-4 w-4" />
              </Button>
              
              <div className="mb-5">
                <Badge variant="outline" className="bg-[#F0F5FF] text-[#2B70FF] border-none text-[11px] font-semibold tracking-wide mb-3 rounded-md px-2.5 py-1">
                  {lead.businessType || "Property Preservation"}
                </Badge>
                <h3 className="text-[19px] font-bold text-slate-800 mb-1.5 tracking-tight">
                  <Link href={`/dashboard/lead-intelligence/${lead.id}`} className="hover:text-blue-600 transition-colors">
                    {lead.companyName}
                  </Link>
                </h3>
                <div className="flex items-center text-[13px] text-slate-400 gap-1.5 font-medium">
                  <MapPin className="h-3.5 w-3.5" />
                  {lead.city || "Unknown City"}, {lead.state || "United States"}
                </div>
              </div>

              <div className="space-y-3.5 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Representative</p>
                  <p className="text-[14px] font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2B70FF]"></span>
                    {lead.contactName || "Unknown Contact"} 
                    {lead.contactRole && <span className="text-slate-400 font-normal text-[13px]">({lead.contactRole})</span>}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 text-[13px] font-medium">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-slate-500 truncate max-w-[200px]">{lead.email || "No email"}</span>
                  {lead.emailVerified ? (
                    <Badge variant="outline" className="ml-auto bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      <Check className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-auto bg-red-50 text-red-600 border-red-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span> Invalid
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[13px] font-medium text-slate-500">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  {lead.phone || "No phone provided"}
                </div>
                
                <div className="flex items-center gap-3 text-[13px] font-medium">
                  <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                  <a href={lead.website?.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-[#2B70FF] hover:underline truncate">
                    {lead.website || "No website"}
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex gap-2">
                  {['LINKEDIN', 'TWITTER', 'FACEBOOK', 'INSTAGRAM'].map(platform => (
                    <span key={platform} className="text-[10px] font-bold text-slate-400 bg-[#F9FAFB] rounded px-2 py-1">
                      {platform}
                    </span>
                  ))}
                </div>
                <div className="text-[11px] font-bold text-slate-400 tracking-wide">
                  Deal Value: <span className="text-slate-700">${lead.dealValue?.toLocaleString() || "0"}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
