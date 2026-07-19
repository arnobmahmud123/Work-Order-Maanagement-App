"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Building2, Phone, Mail, MapPin, 
  Globe, Briefcase, Clock, Activity, MessageSquare, 
  Send, Plus, CheckCircle2, MoreVertical
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function LeadProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Note states
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchLead();
  }, [id]);

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (res.ok) {
        setLead(await res.json());
      } else {
        router.push("/dashboard/lead-intelligence");
      }
    } catch (error) {
      console.error("Failed to fetch lead", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchLead();
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newNote })
      });
      if (res.ok) {
        setNewNote("");
        fetchLead();
      }
    } catch (error) {
      console.error("Failed to add note", error);
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[500px]">
        <div className="text-text-secondary animate-pulse">Loading profile...</div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/lead-intelligence">
            <Button variant="outline" size="sm" className="bg-surface hover:bg-surface-hover">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
          </Link>
        </div>
        <div className="flex gap-2">
          {["NEW", "CONTACTED", "VERIFIED", "CONVERTED", "REJECTED"].map((status) => (
            <Button 
              key={status}
              size="sm"
              variant={lead.status === status ? "primary" : "outline"}
              className={lead.status === status ? "bg-brand-accent text-white" : "bg-surface hover:bg-surface-hover text-text-secondary"}
              onClick={() => updateStatus(status)}
            >
              Mark as {status}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Details */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 bg-surface-elevated border-border-subtle">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-brand-accent/20 to-blue-600/20 flex items-center justify-center border border-brand-accent/30">
                  <Building2 className="h-8 w-8 text-brand-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">{lead.companyName}</h2>
                  <p className="text-text-secondary flex items-center gap-1 mt-1">
                    <Briefcase className="h-4 w-4" />
                    {lead.businessType}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 items-center">
                <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Score
                </span>
                <div className="col-span-2 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${lead.verificationScore > 75 ? 'bg-emerald-500' : lead.verificationScore > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${lead.verificationScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-text-primary">{lead.verificationScore}/100</span>
                </div>
              </div>
              
              <div className="h-px w-full bg-border-subtle my-2" />

              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="h-4 w-4 text-text-secondary shrink-0 mt-0.5" />
                  <span className="text-text-primary">{lead.phone || "No phone provided"}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="h-4 w-4 text-text-secondary shrink-0 mt-0.5" />
                  <span className="text-text-primary">{lead.email || "No email provided"}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-text-secondary shrink-0 mt-0.5" />
                  <span className="text-text-primary">
                    {lead.address}<br />
                    {lead.city}, {lead.state} {lead.zipCode}
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Globe className="h-4 w-4 text-text-secondary shrink-0 mt-0.5" />
                  {lead.website ? (
                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-brand-accent hover:underline">
                      {lead.website}
                    </a>
                  ) : (
                    <span className="text-text-secondary">No website</span>
                  )}
                </div>
              </div>

              <div className="h-px w-full bg-border-subtle my-2" />

              <div>
                <p className="text-sm font-medium text-text-secondary mb-3">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {lead.tags?.length > 0 ? lead.tags.map((tag: any) => (
                    <Badge key={tag.id} variant="outline" className="bg-surface text-text-secondary border-border-subtle">
                      {tag.name}
                    </Badge>
                  )) : (
                    <span className="text-sm text-text-secondary">No tags added.</span>
                  )}
                  <Button variant="outline" size="sm" className="h-6 rounded-full px-2 py-0 border-dashed border-border-subtle text-text-secondary hover:text-text-primary">
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Timeline & Notes */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-surface-elevated border-border-subtle">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-brand-accent" />
              Internal Notes
            </h3>
            
            <div className="flex gap-3 mb-6">
              <Input 
                placeholder="Add a note about this lead..." 
                className="bg-surface border-border-subtle flex-1"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
              />
              <Button onClick={addNote} disabled={savingNote || !newNote.trim()} className="bg-brand-accent text-white hover:bg-brand-accent/90">
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {lead.notes?.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-4">No notes yet.</p>
              ) : lead.notes?.map((note: any) => (
                <div key={note.id} className="bg-surface rounded-lg p-4 border border-border-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">{note.authorName}</span>
                    <span className="text-xs text-text-secondary flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">{note.content}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-surface-elevated border-border-subtle">
            <h3 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              Activity Timeline
            </h3>
            
            <div className="space-y-6">
              {lead.activities?.map((activity: any, index: number) => (
                <div key={activity.id} className="relative flex gap-4">
                  {/* Timeline line */}
                  {index !== lead.activities.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-border-subtle" />
                  )}
                  
                  <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface border border-border-subtle">
                    {activity.type === 'STATUS_CHANGE' ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : activity.type === 'NOTE_ADDED' ? (
                      <MessageSquare className="h-3 w-3 text-blue-500" />
                    ) : (
                      <Activity className="h-3 w-3 text-text-secondary" />
                    )}
                  </div>
                  
                  <div className="flex-1 pb-1">
                    <p className="text-sm text-text-primary">
                      <span className="font-medium">{activity.authorName}</span>{" "}
                      {activity.content}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
