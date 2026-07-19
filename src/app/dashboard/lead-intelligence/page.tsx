"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, MapPin, Target, Building2, Phone, Mail, 
  Globe, Plus, Check, Download, Users, Briefcase
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AILeadFinderPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Finder Form State
  const [keyword, setKeyword] = useState("Property Preservation Contractor");
  const [sourceChannel, setSourceChannel] = useState("Google Maps & Business Directories");
  const [location, setLocation] = useState("Texas");
  const [country, setCountry] = useState("United States");
  const [stateRegion, setStateRegion] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [engineMethod, setEngineMethod] = useState("US Directory Database");
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
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error("Failed to fetch leads", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads(); // Simulating scraping by re-fetching
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto bg-background/50 min-h-screen">
      
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          Outscraper Lead Finder & CRM
        </h1>
        <div className="flex gap-2">
           <Button variant="outline" className="bg-surface hover:bg-surface-hover">
             Remix
           </Button>
           <Button variant="outline" className="bg-surface hover:bg-surface-hover">
             Device
           </Button>
        </div>
      </div>

      {/* Target Industry Shortcuts */}
      <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
        {[
          { title: "Preservation...", desc: "Winterization, Boarding,..." },
          { title: "General Contractor", desc: "Roofing, Repair estimation,..." },
          { title: "Inspection Company", desc: "Occupancy audits, Damag..." },
          { title: "Property Inspector", desc: "Local inspectors, Loss..." },
          { title: "3rd Party Professional", desc: "Advisory, Title, Client..." }
        ].map((item, i) => (
          <Card key={i} className={`p-4 min-w-[220px] shrink-0 cursor-pointer transition-all ${i === 0 ? 'border-brand-accent/50 bg-brand-accent/5 shadow-sm' : 'border-border-subtle bg-surface hover:border-brand-accent/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              {i === 0 ? <Briefcase className="h-4 w-4 text-brand-accent" /> : <Building2 className="h-4 w-4 text-text-secondary" />}
              <p className={`font-semibold text-sm ${i === 0 ? 'text-text-primary' : 'text-text-secondary'}`}>{item.title}</p>
            </div>
            <p className="text-xs text-text-secondary truncate">{item.desc}</p>
          </Card>
        ))}
      </div>

      {/* Main Filter Form */}
      <Card className="p-6 bg-surface border-border-subtle shadow-sm space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Target Industry / Keyword</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9 bg-background border-border-subtle h-11"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Extraction Source Channel</label>
            <select 
              value={sourceChannel}
              onChange={(e) => setSourceChannel(e.target.value)}
              className="w-full h-11 rounded-md border border-border-subtle bg-background px-3 text-sm text-text-primary"
            >
              <option>Google Maps & Business Directories</option>
              <option>LinkedIn Profiles & Company Pages</option>
              <option>Facebook Groups & Online Communities</option>
            </select>
          </div>
        </div>

        <Card className="p-5 border-border-subtle bg-background/50 space-y-4">
          <div className="flex items-center gap-2 text-brand-accent mb-2">
            <MapPin className="h-4 w-4" />
            <h3 className="text-sm font-bold tracking-wide uppercase">High-Precision Geographic Filtering</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">General Location</label>
              <Input value={location} onChange={e=>setLocation(e.target.value)} className="bg-surface h-10 text-sm" />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Country</label>
              <Input value={country} onChange={e=>setCountry(e.target.value)} className="bg-surface h-10 text-sm" />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">State / Region</label>
              <Input placeholder="e.g. TX, IL, CA" value={stateRegion} onChange={e=>setStateRegion(e.target.value)} className="bg-surface h-10 text-sm" />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">City</label>
              <Input placeholder="e.g. Dallas, Chicago" value={city} onChange={e=>setCity(e.target.value)} className="bg-surface h-10 text-sm" />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase">Zip Range / Code</label>
              <Input placeholder="e.g. 75001-75050" value={zipCode} onChange={e=>setZipCode(e.target.value)} className="bg-surface h-10 text-sm" />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Extraction Engine Method</label>
            <div className="flex gap-2">
              <Button 
                variant={engineMethod === "US Directory Database" ? "primary" : "outline"} 
                className={`flex-1 h-11 ${engineMethod === "US Directory Database" ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" : "bg-background text-text-secondary"}`}
                onClick={() => setEngineMethod("US Directory Database")}
              >
                US Directory Database (Bulk)
              </Button>
              <Button 
                variant={engineMethod === "AI Real-Time Grounded Search" ? "primary" : "outline"} 
                className={`flex-1 h-11 ${engineMethod === "AI Real-Time Grounded Search" ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" : "bg-background text-text-secondary"}`}
                onClick={() => setEngineMethod("AI Real-Time Grounded Search")}
              >
                AI Real-Time Grounded Search
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Target Lead Quantity</label>
            <select 
              value={leadQuantity}
              onChange={(e) => setLeadQuantity(e.target.value)}
              className="w-full h-11 rounded-md border border-border-subtle bg-background px-3 text-sm text-text-primary"
            >
              <option>100 Leads (Professional)</option>
              <option>500 Leads (Corporate)</option>
              <option>1,000 Leads (Enterprise)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleScrape} className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6 shadow-md shadow-blue-500/20">
            <Target className="mr-2 h-4 w-4" /> Scrape Leads with AI Search
          </Button>
        </div>
      </Card>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
             <p className="text-sm text-text-secondary">All contacts listed below are verified and available for immediate CRM pipelining.</p>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" className="bg-surface h-10 border-border-subtle text-text-secondary">
               <Download className="mr-2 h-4 w-4" /> Download Full Segment CSV (100 Leads)
             </Button>
             <Button variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 h-10 hover:bg-emerald-100">
               <Check className="mr-2 h-4 w-4" /> All Emails Verified
             </Button>
             <Button className="bg-blue-600 hover:bg-blue-700 text-white h-10 shadow-sm shadow-blue-500/20">
               Import Preview (100) to CRM
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
             <div className="col-span-2 text-center py-10 text-text-secondary">Loading extracted leads...</div>
          ) : leads.map(lead => (
            <Card key={lead.id} className="p-5 bg-surface border-border-subtle shadow-sm hover:shadow-md transition-shadow relative">
              <Button variant="ghost" className="absolute top-4 right-4 h-8 w-8 rounded-full border border-border-subtle text-text-secondary flex items-center justify-center p-0">
                <Plus className="h-4 w-4" />
              </Button>
              
              <div className="mb-4">
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] font-semibold tracking-wider mb-2">
                  {lead.businessType || "Property Preservation"}
                </Badge>
                <h3 className="text-lg font-bold text-text-primary mb-1">
                  <Link href={`/dashboard/lead-intelligence/${lead.id}`} className="hover:text-blue-600 transition-colors">
                    {lead.companyName}
                  </Link>
                </h3>
                <div className="flex items-center text-xs text-text-secondary gap-1">
                  <MapPin className="h-3 w-3" />
                  {lead.city || "Unknown City"}, {lead.state || "Unknown State"}, United States
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Representative</p>
                  <p className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    {lead.contactName || "Unknown Contact"} 
                    {lead.contactRole && <span className="text-text-secondary font-normal text-xs ml-1">({lead.contactRole})</span>}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-text-secondary shrink-0" />
                  <span className="text-text-secondary">{lead.email || "No email"}</span>
                  {lead.emailVerified ? (
                    <Badge variant="outline" className="ml-auto bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] uppercase tracking-wider px-1.5 py-0">
                      <Check className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-auto bg-red-50 text-red-600 border-red-200 text-[9px] uppercase tracking-wider px-1.5 py-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span> Invalid
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <Phone className="h-4 w-4 shrink-0" />
                  {lead.phone || "No phone provided"}
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="h-4 w-4 text-text-secondary shrink-0" />
                  <a href={lead.website?.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                    {lead.website || "No website"}
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                <div className="flex gap-2">
                  {['LINKEDIN', 'TWITTER', 'FACEBOOK', 'INSTAGRAM'].map(platform => (
                    <span key={platform} className="text-[9px] font-bold text-text-secondary bg-background border border-border-subtle rounded px-1.5 py-0.5">
                      {platform}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  Deal Value: <span className="text-text-primary">${lead.dealValue?.toLocaleString() || "0"}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
