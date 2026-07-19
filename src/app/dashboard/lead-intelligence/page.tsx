"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, Filter, Plus, Target, Building2, Phone, Mail, 
  MapPin, CheckCircle2, ChevronRight, BarChart3, Users, 
  TrendingUp, Activity, Clock
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function LeadIntelligencePage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [businessType, setBusinessType] = useState("");

  useEffect(() => {
    fetchAnalytics();
    fetchLeads();
  }, [status, businessType]); // Re-fetch on filter change

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/leads/analytics");
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (status) params.append("status", status);
      if (businessType) params.append("businessType", businessType);
      
      const res = await fetch(`/api/leads?${params.toString()}`);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'NEW': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'CONTACTED': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'VERIFIED': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'CONVERTED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'REJECTED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Target className="h-6 w-6 text-brand-accent" />
            Lead Intelligence
          </h1>
          <p className="text-text-secondary mt-1">
            Discover, verify, and manage property preservation contractor leads.
          </p>
        </div>
        <Button className="bg-brand-accent text-white hover:bg-brand-accent/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-surface-elevated border-border-subtle hover:border-brand-accent/30 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary font-medium">Total Leads</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">
                {analytics?.totalLeads || 0}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-surface-elevated border-border-subtle hover:border-brand-accent/30 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary font-medium">Verified Leads</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">
                {analytics?.verifiedLeads || 0}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-surface-elevated border-border-subtle hover:border-brand-accent/30 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary font-medium">Conversion Rate</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">
                {analytics?.conversionRate || 0}%
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-surface-elevated border-border-subtle hover:border-brand-accent/30 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary font-medium">New This Week</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">
                {analytics?.recentlyAdded || 0}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="p-4 bg-surface-elevated border-border-subtle flex flex-col md:flex-row gap-4 items-center">
        <form onSubmit={handleSearch} className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input 
            placeholder="Search by company name, city, ZIP, phone..." 
            className="pl-9 w-full bg-surface"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            className="h-10 rounded-md border border-input bg-surface px-3 text-sm flex-1 md:w-[160px] text-text-primary"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="VERIFIED">Verified</option>
            <option value="CONVERTED">Converted</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select 
            className="h-10 rounded-md border border-input bg-surface px-3 text-sm flex-1 md:w-[180px] text-text-primary"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
          >
            <option value="">All Business Types</option>
            <option value="General Contractor">General Contractor</option>
            <option value="Cleaning Company">Cleaning Company</option>
            <option value="Roofing Contractor">Roofing Contractor</option>
            <option value="Lawn Care">Lawn Care</option>
            <option value="Locksmith">Locksmith</option>
          </select>
          <Button variant="outline" className="border-border-subtle hover:bg-surface-hover">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </Button>
        </div>
      </Card>

      {/* Leads Table */}
      <Card className="border-border-subtle bg-surface-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface/50 text-text-secondary uppercase border-b border-border-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-secondary flex flex-col items-center">
                    <Target className="h-8 w-8 text-text-secondary/50 mb-2" />
                    <p>No leads found matching your filters.</p>
                  </td>
                </tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-surface/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-surface flex items-center justify-center border border-border-subtle">
                        <Building2 className="h-5 w-5 text-text-secondary" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">{lead.companyName}</p>
                        <p className="text-xs text-text-secondary truncate max-w-[200px]">
                          {lead.businessType} • {lead.source || "Manual"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="font-medium text-text-primary">{lead.contactName || "Unknown"}</p>
                      <div className="flex gap-2 text-xs text-text-secondary">
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {(lead.city || lead.state) ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {lead.city}{lead.city && lead.state ? ", " : ""}{lead.state} {lead.zipCode}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${lead.verificationScore > 75 ? 'bg-emerald-500' : lead.verificationScore > 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                          style={{ width: `${lead.verificationScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-text-secondary">{lead.verificationScore}/100</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/lead-intelligence/${lead.id}`}>
                      <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity bg-surface hover:bg-surface-hover">
                        View Details <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
