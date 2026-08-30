"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useInspectors, useCreateWorkOrder } from "@/hooks/use-data";
import { Card, CardHeader, CardTitle, Button, Badge, Avatar, Input, Modal } from "@/components/ui";
import {
  MapPin,
  Search,
  Filter,
  Phone,
  Mail,
  MessageSquare,
  Star,
  Clock,
  ChevronDown,
  Wrench,
  Zap,
  Thermometer,
  Home,
  Bug,
  Building2,
  Loader2,
  Navigation,
  X,
  Plus,
  Users,
  TrendingUp,
  CheckCircle2,
  Shield,
  Calendar,
  Award,
  Briefcase,
  BarChart3,
  ChevronRight,
  Eye,
  UserPlus,
  Activity,
  Percent,
  Timer,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const SPECIALTIES = [
  { value: "PLUMBER", label: "Plumber", icon: Wrench, color: "bg-blue-100 text-blue-700" },
  { value: "ELECTRICIAN", label: "Electrician", icon: Zap, color: "bg-yellow-100 text-yellow-700" },
  { value: "HVAC", label: "HVAC", icon: Thermometer, color: "bg-green-100 text-green-700" },
  { value: "ROOFER", label: "Roofer", icon: Home, color: "bg-orange-100 text-orange-700" },
  { value: "GENERAL", label: "General", icon: Wrench, color: "bg-surface-hover text-text-dim" },
  { value: "PEST_CONTROL", label: "Pest Control", icon: Bug, color: "bg-red-100 text-red-700" },
  { value: "STRUCTURAL", label: "Structural", icon: Building2, color: "bg-purple-100 text-purple-700" },
  { value: "ENVIRONMENTAL", label: "Environmental", icon: Building2, color: "bg-teal-100 text-teal-700" },
  { value: "SEPTIC", label: "Septic", icon: Wrench, color: "bg-amber-100 text-amber-700" },
  { value: "WELL", label: "Well", icon: Wrench, color: "bg-cyan-100 text-cyan-700" },
  { value: "POOL", label: "Pool", icon: Wrench, color: "bg-sky-100 text-sky-700" },
  { value: "FIRE_SAFETY", label: "Fire Safety", icon: Wrench, color: "bg-rose-100 text-rose-700" },
];

const AVAILABILITY_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  BUSY: "bg-yellow-100 text-yellow-800",
  UNAVAILABLE: "bg-red-100 text-red-800",
};

export default function InspectorsPage() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [availability, setAvailability] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(50);
  const [selectedInspector, setSelectedInspector] = useState<any>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const filters: any = {};
  if (search) filters.search = search;
  if (specialty) filters.specialty = specialty;
  if (availability) filters.availability = availability;
  if (coords) {
    filters.lat = coords.lat;
    filters.lng = coords.lng;
    filters.radius = radius;
  }

  const { data, isLoading } = useInspectors(filters);
  const inspectors = data?.inspectors || [];

  // Stats
  const totalInspectors = inspectors.length;
  const availableCount = inspectors.filter((i: any) => i.availability === "AVAILABLE").length;
  const avgRating = totalInspectors > 0 ? (inspectors.reduce((sum: number, i: any) => sum + (i.rating || 0), 0) / totalInspectors).toFixed(1) : "0.0";
  const certifiedCount = inspectors.filter((i: any) => i.specialties?.some((s: any) => s.certified)).length;

  // Load Leaflet
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const init = async () => {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      const L = (window as any).L;
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      
      const map = L.map(mapRef.current!, {
        zoomControl: false,
        attributionControl: false,
      }).setView(coords ? [coords.lat, coords.lng] : [39.8283, -98.5795], coords ? 10 : 4);

      const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        className: isDark ? "dark-tiles" : "",
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.control.attribution({ position: "bottomleft", prefix: false })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')
        .addTo(map);

      leafletMapRef.current = map;
      setMapReady(true);
    };

    init();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const L = (window as any).L;
    const map = leafletMapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    inspectors.forEach((inspector: any) => {
      if (!inspector.latitude || !inspector.longitude) return;

      const color = inspector.availability === "AVAILABLE" ? "#10b981" : inspector.availability === "BUSY" ? "#f59e0b" : "#ef4444";
      
      const icon = L.divIcon({
        className: "inspector-marker",
        html: `
          <div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([inspector.latitude, inspector.longitude], { icon })
        .addTo(map);

      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 180px; padding: 4px;">
          <h3 style="font-weight: 600; margin: 0 0 4px 0; color: #1e293b;">${inspector.name}</h3>
          ${inspector.company ? `<p style="color: #64748b; font-size: 11px; margin: 0 0 4px 0;">${inspector.company}</p>` : ""}
          <p style="color: #64748b; font-size: 11px; margin: 0;">${inspector.specialties?.map((s: any) => s.specialty).join(", ") || ""}</p>
          ${inspector.distance !== undefined ? `<p style="font-size: 11px; margin: 4px 0 0 0; color: #06b6d4; font-weight: 600;">📍 ${inspector.distance} miles away</p>` : ""}
        </div>
      `, { closeButton: false });

      marker.on("click", () => {
        setSelectedInspector(inspector);
        setShowDetailPanel(true);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (inspectors.length > 0) {
      const bounds = L.latLngBounds(inspectors.filter((i: any) => i.latitude && i.longitude).map((i: any) => [i.latitude, i.longitude]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [inspectors, mapReady]);

  const handleLocationSearch = useCallback(async () => {
    if (!locationSearch) return;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=1`);
      const results = await res.json();
      if (results && results[0]) {
        const newCoords = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
        setCoords(newCoords);
        if (leafletMapRef.current) {
          leafletMapRef.current.setView([newCoords.lat, newCoords.lng], 10);
        }
      } else {
        toast.error("Could not find that location");
      }
    } catch (e) {
      toast.error("Search failed");
    }
  }, [locationSearch]);

  function handleRequestInspection(inspector: any) {
    setSelectedInspector(inspector);
    setShowRequestModal(true);
  }

  function handleViewDetail(inspector: any) {
    setSelectedInspector(inspector);
    setShowDetailPanel(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Inspector Directory</h1>
          <p className="text-text-muted mt-1">
            Find and contact inspection professionals near you
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Inspector
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Inspectors", value: totalInspectors, icon: Users, color: "text-blue-500 bg-blue-500/10" },
          { label: "Available Now", value: availableCount, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Avg Rating", value: avgRating, icon: Star, color: "text-amber-500 bg-amber-500/10" },
          { label: "Certified", value: certifiedCount, icon: Shield, color: "text-cyan-400 bg-cyan-400/10" },
        ].map((stat) => (
          <Card key={stat.label} padding={false}>
            <div className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name, company, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full rounded-lg border border-border-medium pl-10 pr-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            >
              <option value="">All Specialties</option>
              {SPECIALTIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            >
              <option value="">Any Availability</option>
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </div>
        </div>

        {/* Location Search */}
        <div className="mt-4 flex gap-3">
          <div className="flex-1 relative">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Enter address or zip code for proximity search..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
              className="block w-full rounded-lg border border-border-medium pl-10 pr-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
          <Button onClick={handleLocationSearch} variant="outline">
            <MapPin className="h-4 w-4" />
            Search Area
          </Button>
          {coords && (
            <div className="flex items-center gap-2">
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
              >
                <option value={10}>10 mi</option>
                <option value={25}>25 mi</option>
                <option value={50}>50 mi</option>
                <option value={100}>100 mi</option>
              </select>
              <button
                onClick={() => {
                  setCoords(null);
                  setLocationSearch("");
                }}
                className="p-2 text-text-muted hover:text-text-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map */}
        <Card className="lg:col-span-3" padding={false}>
          <style jsx global>{`
            .dark-tiles {
              filter: brightness(0.65) invert(1) contrast(3) hue-rotate(200deg) saturate(0.28) brightness(0.75) !important;
            }
          `}</style>
          <div
            ref={mapRef}
            className="w-full h-[500px] rounded-xl overflow-hidden"
          >
            {!mapReady && (
              <div className="w-full h-full flex items-center justify-center bg-surface-hover">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-text-muted animate-spin mx-auto mb-2" />
                  <p className="text-sm text-text-muted">Loading map...</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Inspector List */}
        <div className="lg:col-span-2 space-y-3 max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <Card>
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-surface-hover rounded-lg" />
                ))}
              </div>
            </Card>
          ) : inspectors.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-text-dim mx-auto mb-3" />
                <p className="font-medium text-text-primary">No inspectors found</p>
                <p className="text-sm text-text-muted mt-1">
                  Try adjusting your search or filters
                </p>
              </div>
            </Card>
          ) : (
            inspectors.map((inspector: any) => (
              <Card
                key={inspector.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedInspector?.id === inspector.id && "ring-2 ring-indigo-500"
                )}
                padding={false}
              >
                <div
                  className="p-4"
                  onClick={() => handleViewDetail(inspector)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={inspector.name} src={inspector.imageUrl} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-text-primary truncate">
                          {inspector.name}
                        </h3>
                        <Badge className={AVAILABILITY_COLORS[inspector.availability]}>
                          {inspector.availability}
                        </Badge>
                      </div>
                      {inspector.company && (
                        <p className="text-xs text-text-muted mt-0.5">{inspector.company}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {inspector.specialties?.map((s: any) => {
                          const spec = SPECIALTIES.find((sp) => sp.value === s.specialty);
                          return (
                            <span key={s.id} className="inline-flex items-center gap-1">
                              <Badge className={spec?.color || "bg-surface-hover text-text-dim"}>
                                {spec?.label || s.specialty}
                              </Badge>
                              {s.certified && (
                                <span title="Certified">
                                  <Shield className="h-3 w-3 text-cyan-400 fill-cyan-400/20" />
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        {inspector.rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            {inspector.rating.toFixed(1)} ({inspector.reviewCount})
                          </span>
                        )}
                        {inspector.hourlyRate && (
                          <span>{formatCurrency(inspector.hourlyRate)}/hr</span>
                        )}
                        {inspector.distance !== undefined && (
                          <span className="text-cyan-400 font-medium">
                            📍 {inspector.distance} mi
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0 mt-1" />
                  </div>

                  {/* Contact Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
                    {inspector.phone && (
                      <a
                        href={`tel:${inspector.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        Call
                      </a>
                    )}
                    {inspector.email && (
                      <a
                        href={`mailto:${inspector.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Mail className="h-3 w-3" />
                        Email
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestInspection(inspector);
                      }}
                      className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/[0.06] rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Request
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Inspector Detail Panel */}
      <InspectorDetailPanel
        inspector={selectedInspector}
        isOpen={showDetailPanel}
        onClose={() => setShowDetailPanel(false)}
        onRequestInspection={(inspector) => {
          setShowDetailPanel(false);
          handleRequestInspection(inspector);
        }}
      />

      {/* Request Inspection Modal */}
      <RequestInspectionModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        inspector={selectedInspector}
      />

      {/* Add Inspector Modal */}
      <AddInspectorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}

// ─── Inspector Detail Panel ──────────────────────────────────────────────────

function InspectorDetailPanel({
  inspector,
  isOpen,
  onClose,
  onRequestInspection,
}: {
  inspector: any;
  isOpen: boolean;
  onClose: () => void;
  onRequestInspection: (inspector: any) => void;
}) {
  if (!isOpen || !inspector) return null;

  const certifications = inspector.specialties?.filter((s: any) => s.certified) || [];
  const totalExp = inspector.specialties?.reduce((max: number, s: any) => Math.max(max, s.yearsExp || 0), 0) || 0;
  const completionRate = inspector.reviewCount > 0 ? Math.min(98, Math.round(85 + inspector.rating * 3)) : 0;
  const avgResponseTime = inspector.availability === "AVAILABLE" ? "< 2 hrs" : inspector.availability === "BUSY" ? "4-8 hrs" : "N/A";

  // Mock schedule slots
  const scheduleSlots = [
    { day: "Today", times: inspector.availability === "AVAILABLE" ? ["9:00 AM", "1:00 PM", "3:30 PM"] : [] },
    { day: "Tomorrow", times: ["8:00 AM", "10:30 AM", "2:00 PM", "4:00 PM"] },
    { day: "Wed", times: ["9:00 AM", "11:00 AM", "1:00 PM"] },
  ];

  // Mock recent inspections
  const recentInspections = [
    { address: "456 Oak Street, Chicago, IL", type: "General", date: "2 days ago", rating: 5 },
    { address: "789 Maple Ave, Naperville, IL", type: "Structural", date: "5 days ago", rating: 4 },
    { address: "321 Pine Rd, Joliet, IL", type: "Plumbing", date: "1 week ago", rating: 5 },
    { address: "654 Elm Blvd, Aurora, IL", type: "HVAC", date: "2 weeks ago", rating: 4 },
  ];

  return createPortal(
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: 2147483600 }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border-l border-border-subtle overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border-subtle p-6 z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={inspector.name} src={inspector.imageUrl} size="lg" />
              <div>
                <h2 className="text-lg font-bold text-text-primary">{inspector.name}</h2>
                {inspector.company && (
                  <p className="text-sm text-text-muted">{inspector.company}</p>
                )}
                <Badge className={cn("mt-1", AVAILABILITY_COLORS[inspector.availability])}>
                  {inspector.availability}
                </Badge>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-hover rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="text-lg font-bold text-text-primary">{inspector.rating?.toFixed(1) || "N/A"}</span>
              </div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Avg Rating</p>
            </div>
            <div className="bg-surface-hover rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-lg font-bold text-text-primary">{completionRate}%</span>
              </div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Completion Rate</p>
            </div>
            <div className="bg-surface-hover rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Timer className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-bold text-text-primary">{avgResponseTime}</span>
              </div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Response Time</p>
            </div>
            <div className="bg-surface-hover rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Activity className="h-4 w-4 text-purple-500" />
                <span className="text-lg font-bold text-text-primary">{inspector._count?.callLogs || inspector.reviewCount || 0}</span>
              </div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Inspections</p>
            </div>
          </div>

          {/* Bio */}
          {inspector.bio && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-text-muted" />
                About
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">{inspector.bio}</p>
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Contact Information</h3>
            <div className="space-y-2">
              {inspector.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-text-muted" />
                  <a href={`tel:${inspector.phone}`} className="text-cyan-400 hover:underline">{inspector.phone}</a>
                </div>
              )}
              {inspector.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-text-muted" />
                  <a href={`mailto:${inspector.email}`} className="text-cyan-400 hover:underline">{inspector.email}</a>
                </div>
              )}
              {inspector.city && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-text-muted" />
                  <span className="text-text-dim">{inspector.city}, {inspector.state} {inspector.zipCode}</span>
                </div>
              )}
              {inspector.hourlyRate && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-text-muted" />
                  <span className="text-text-dim">{formatCurrency(inspector.hourlyRate)}/hour</span>
                </div>
              )}
              {totalExp > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-text-muted" />
                  <span className="text-text-dim">{totalExp} years experience</span>
                </div>
              )}
            </div>
          </div>

          {/* Specialties & Certifications */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-text-muted" />
              Specialties & Certifications
            </h3>
            <div className="space-y-2">
              {inspector.specialties?.map((s: any) => {
                const spec = SPECIALTIES.find((sp) => sp.value === s.specialty);
                return (
                  <div key={s.id} className="flex items-center justify-between bg-surface-hover rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Badge className={spec?.color || "bg-surface-hover text-text-dim"}>
                        {spec?.label || s.specialty}
                      </Badge>
                      {s.yearsExp && (
                        <span className="text-xs text-text-muted">{s.yearsExp}yr exp</span>
                      )}
                    </div>
                    {s.certified && (
                      <span className="flex items-center gap-1 text-xs text-cyan-400 font-medium">
                        <Shield className="h-3.5 w-3.5 fill-cyan-400/20" />
                        Certified
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Inspections */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-text-muted" />
              Recent Inspections
            </h3>
            <div className="space-y-2">
              {recentInspections.map((job, i) => (
                <div key={i} className="flex items-center gap-3 bg-surface-hover rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{job.address}</p>
                    <p className="text-xs text-text-muted">{job.type} • {job.date}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: job.rating }).map((_, j) => (
                      <Star key={j} className="h-3 w-3 text-amber-500 fill-amber-500" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Available Schedule */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-muted" />
              Available Schedule Slots
            </h3>
            <div className="space-y-2">
              {scheduleSlots.map((slot) => (
                <div key={slot.day} className="bg-surface-hover rounded-lg p-3">
                  <p className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">{slot.day}</p>
                  {slot.times.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {slot.times.map((time) => (
                        <span key={time} className="px-2.5 py-1 text-xs font-medium bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
                          {time}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted">No available slots</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {inspector.phone && (
              <a
                href={`tel:${inspector.phone}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-green-700 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
            )}
            {inspector.email && (
              <a
                href={`mailto:${inspector.email}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
            )}
            <button
              onClick={() => onRequestInspection(inspector)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl hover:shadow-lg transition-all"
            >
              <MessageSquare className="h-4 w-4" />
              Request
            </button>
          </div>
        </div>
      </div>
    </div>
  , document.body);
}

// ─── DollarSign icon (inline to avoid import issues) ─────────────────────────
function DollarSign({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

// ─── Add Inspector Modal ─────────────────────────────────────────────────────

function AddInspectorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    bio: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    hourlyRate: "",
    specialties: [] as { specialty: string; yearsExp: string; certified: boolean }[],
  });
  const [saving, setSaving] = useState(false);

  function addSpecialty() {
    setForm({
      ...form,
      specialties: [...form.specialties, { specialty: "", yearsExp: "", certified: false }],
    });
  }

  function updateSpecialty(index: number, field: string, value: any) {
    const updated = [...form.specialties];
    (updated[index] as any)[field] = value;
    setForm({ ...form, specialties: updated });
  }

  function removeSpecialty(index: number) {
    setForm({ ...form, specialties: form.specialties.filter((_, i) => i !== index) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/inspectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : null,
          specialties: form.specialties.map((s) => ({
            specialty: s.specialty,
            yearsExp: s.yearsExp ? parseInt(s.yearsExp) : null,
            certified: s.certified,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create inspector");
      }
      toast.success("Inspector created successfully");
      onClose();
      setForm({
        name: "", email: "", phone: "", company: "", bio: "",
        address: "", city: "", state: "", zipCode: "", hourlyRate: "",
        specialties: [],
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create inspector");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Inspector" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">Name *</label>
            <input
              type="text" required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">Company</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company name"
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 123-4567"
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Brief professional background..."
            rows={2}
            className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-dim mb-1">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">State</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">Zip</label>
            <input
              type="text"
              value={form.zipCode}
              onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">Hourly Rate ($)</label>
          <input
            type="number" min="0" step="5"
            value={form.hourlyRate}
            onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
            placeholder="e.g. 125"
            className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>

        {/* Specialties */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-text-dim">Specialties</label>
            <Button type="button" size="xs" variant="outline" onClick={addSpecialty}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          <datalist id="specialty-options">
            {SPECIALTIES.map((sp) => (
              <option key={sp.value} value={sp.label} />
            ))}
          </datalist>
          {form.specialties.length === 0 && (
            <p className="text-xs text-text-muted text-center py-3">No specialties added yet</p>
          )}
          <div className="space-y-2">
            {form.specialties.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={s.specialty}
                    onChange={(e) => updateSpecialty(i, "specialty", e.target.value)}
                    list="specialty-options"
                    placeholder="Type or select a specialty..."
                    className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
                <input
                  type="number" min="0" max="50"
                  value={s.yearsExp}
                  onChange={(e) => updateSpecialty(i, "yearsExp", e.target.value)}
                  placeholder="Yrs"
                  className="w-20 px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none"
                />
                <label className="flex items-center gap-1 text-xs text-text-muted">
                  <input
                    type="checkbox"
                    checked={s.certified}
                    onChange={(e) => updateSpecialty(i, "certified", e.target.checked)}
                    className="rounded border-border-medium"
                  />
                  Cert
                </label>
                <button type="button" onClick={() => removeSpecialty(i)} className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-rose-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>
            <UserPlus className="h-4 w-4 mr-1" />
            Create Inspector
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Request Inspection Modal ────────────────────────────────────────────────

function RequestInspectionModal({
  isOpen,
  onClose,
  inspector,
}: {
  isOpen: boolean;
  onClose: () => void;
  inspector: any;
}) {
  const createWorkOrder = useCreateWorkOrder();
  const [form, setForm] = useState({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
    dueDate: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createWorkOrder.mutateAsync({
        title: `Inspection - ${inspector?.name || "Inspector"}`,
        description: `Inspection requested from ${inspector?.name}. ${form.notes}`,
        address: form.address,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        serviceType: "INSPECTION",
        dueDate: form.dueDate || undefined,
      });
      toast.success("Inspection work order created");
      onClose();
      setForm({ address: "", city: "", state: "", zipCode: "", notes: "", dueDate: "" });
    } catch {
      toast.error("Failed to create work order");
    }
  }

  if (!inspector) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Inspection" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-cyan-500/[0.06] rounded-lg">
          <p className="text-sm font-medium text-indigo-900">{inspector.name}</p>
          {inspector.company && (
            <p className="text-xs text-cyan-400">{inspector.company}</p>
          )}
          {inspector.phone && (
            <p className="text-xs text-cyan-400">{inspector.phone}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-dim mb-1">Property Address</label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Main St"
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1">Zip</label>
              <input
                type="text"
                value={form.zipCode}
                onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">Preferred Date</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any special instructions or details about the inspection..."
            rows={3}
            className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createWorkOrder.isPending}>
            Create Work Order
          </Button>
        </div>
      </form>
    </Modal>
  );
}
