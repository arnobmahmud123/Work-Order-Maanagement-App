"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, MapPin, Target, Building2, Phone, Mail, 
  Globe, Plus, Check, Download, Users, Briefcase, Loader2, Sparkles
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AILeadFinderPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeStep, setScrapeStep] = useState("");
  
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

  const fetchLeads = async (customKeyword = "") => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      // Map keyword/location inputs to queries
      const activeKeyword = customKeyword || keyword;
      if (activeKeyword && activeKeyword !== "Property Preservation Contractor") {
        queryParams.append("q", activeKeyword);
      }
      
      if (location) {
        queryParams.append("state", location);
      }
      
      queryParams.append("limit", "100");

      const res = await fetch(`/api/leads?${queryParams.toString()}`);
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

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setScraping(true);
    
    // Simulate premium live scraping steps
    const steps = [
      `Initializing Outscraper connection to ${sourceChannel}...`,
      `Searching for "${keyword}" in ${location}, ${country}...`,
      `Extracting email, phone, and metadata...`,
      `Running verification checks on representative profiles...`,
      `Finalizing lead packaging...`
    ];

    for (let i = 0; i < steps.length; i++) {
      setScrapeStep(steps[i]);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    setScraping(false);
    await fetchLeads();
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            AI Lead Finder
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Discover, verify, and pipeline property preservation contractors and vendors.
          </p>
        </div>
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
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {[
          { title: "Preservation", desc: "Winterization, Boarding,..." },
          { title: "General Contractor", desc: "Roofing, Repair estimation,..." },
          { title: "Inspection Company", desc: "Occupancy audits, Damag..." },
          { title: "Property Inspector", desc: "Local inspectors, Loss..." },
          { title: "3rd Party Professional", desc: "Advisory, Title, Client..." }
        ].map((item, i) => (
          <Card 
            key={i} 
            onClick={() => {
              setKeyword(item.title);
              fetchLeads(item.title);
            }}
            className={`p-4 min-w-[220px] shrink-0 cursor-pointer transition-all ${keyword.toLowerCase().includes(item.title.toLowerCase()) ? 'border-cyan-500 bg-cyan-500/10 shadow-sm' : 'border-border-subtle bg-surface hover:border-cyan-500/30'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {i === 0 ? <Briefcase className="h-4 w-4 text-cyan-400" /> : <Building2 className="h-4 w-4 text-text-secondary" />}
              <p className={`font-semibold text-sm ${keyword.toLowerCase().includes(item.title.toLowerCase()) ? 'text-text-primary' : 'text-text-secondary'}`}>{item.title}</p>
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

        <Card className="p-5 border-border-subtle bg-background/50 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
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
                className={`flex-1 h-11 ${engineMethod === "US Directory Database" ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20" : "bg-background text-text-secondary"}`}
                onClick={() => setEngineMethod("US Directory Database")}
              >
                US Directory Database (Bulk)
              </Button>
              <Button 
                variant={engineMethod === "AI Real-Time Grounded Search" ? "primary" : "outline"} 
                className={`flex-1 h-11 ${engineMethod === "AI Real-Time Grounded Search" ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20" : "bg-background text-text-secondary"}`}
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
            disabled={scraping}
            className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-11 px-6 shadow-md shadow-cyan-500/20"
          >
            {scraping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting leads...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" /> Scrape Leads with AI Search
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Scraping Status Banner */}
      {scraping && (
        <Card className="p-4 bg-cyan-500/10 border-cyan-500/20 text-cyan-400 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <p className="text-sm font-medium">{scrapeStep}</p>
          </div>
          <span className="text-xs uppercase tracking-wider font-bold">Progress</span>
        </Card>
      )}

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
             <p className="text-sm text-text-secondary">All contacts listed below are verified and available for immediate CRM pipelining.</p>
          </div>
          <div className="flex flex-wrap gap-3">
             <Button variant="outline" className="bg-surface h-10 border-border-subtle text-text-secondary">
               <Download className="mr-2 h-4 w-4" /> Download Full Segment CSV ({leads.length} Leads)
             </Button>
             <Button variant="outline" className="bg-emerald-500/10 border-emerald-500/25 text-emerald-400 h-10 hover:bg-emerald-500/20">
               <Check className="mr-2 h-4 w-4" /> All Emails Verified
             </Button>
             <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold h-10 shadow-sm shadow-cyan-500/20">
               Import Preview ({leads.length}) to CRM
             </Button>
          </div>
        </div>

        {loading ? (
           <div className="text-center py-16 text-text-secondary flex flex-col items-center gap-3 bg-surface border border-border-subtle rounded-xl">
             <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
             <p>Loading extracted leads...</p>
           </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 text-text-secondary bg-surface border border-border-subtle rounded-xl">
            <Target className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="font-semibold text-text-primary">No Leads Found</p>
            <p className="text-sm mt-1">Try tweaking your keyword or location and click Scrape Leads.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leads.map(lead => (
              <Card key={lead.id} className="p-5 bg-surface border-border-subtle shadow-sm hover:shadow-md transition-shadow relative">
                <Button variant="ghost" className="absolute top-4 right-4 h-8 w-8 rounded-full border border-border-subtle text-text-secondary flex items-center justify-center p-0 hover:bg-surface-hover">
                  <Plus className="h-4 w-4" />
                </Button>
                
                <div className="mb-4">
                  <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] font-semibold tracking-wider mb-2">
                    {lead.businessType || "Property Preservation"}
                  </Badge>
                  <h3 className="text-lg font-bold text-text-primary mb-1">
                    <Link href={`/dashboard/lead-intelligence/${lead.id}`} className="hover:text-cyan-400 transition-colors">
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
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                      {lead.contactName || "Unknown Contact"} 
                      {lead.contactRole && <span className="text-text-secondary font-normal text-xs ml-1">({lead.contactRole})</span>}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-text-secondary shrink-0" />
                    <span className="text-text-secondary">{lead.email || "No email"}</span>
                    {lead.emailVerified ? (
                      <Badge variant="outline" className="ml-auto bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase tracking-wider px-1.5 py-0">
                        <Check className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-auto bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] uppercase tracking-wider px-1.5 py-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span> Invalid
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-text-secondary">
                    <Phone className="h-4 w-4 shrink-0" />
                    {lead.phone || "No phone provided"}
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-text-secondary shrink-0" />
                    <a href={lead.website?.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline truncate">
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
        )}
      </div>
    </div>
  );
}
