"use client";

import { useState, useEffect } from "react";
import {
  Navigation,
  MapPin,
  Clock,
  ExternalLink,
  Car,
  CheckCircle2,
  Key,
  Calendar,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Modal, Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface RouteOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractorId?: string;
  workOrderIds?: string[];
  contractorName?: string;
}

export function RouteOptimizerModal({
  isOpen,
  onClose,
  contractorId,
  workOrderIds,
  contractorName,
}: RouteOptimizerModalProps) {
  const [loading, setLoading] = useState(true);
  const [routeData, setRouteData] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      optimizeRoute();
    }
  }, [isOpen, contractorId, workOrderIds]);

  const optimizeRoute = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/logistics/route-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId,
          workOrderIds,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRouteData(data);
      } else {
        toast.error(data.error || "No route stops available to optimize");
      }
    } catch (err) {
      toast.error("Failed to generate optimized route");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Field Route Optimizer (Shortest Distance)"
      size="lg"
    >
      <div className="space-y-5">
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin mx-auto" />
            <p className="text-xs text-text-muted">
              Running 2-Opt Traveling Salesperson route optimization across field properties...
            </p>
          </div>
        ) : !routeData || !routeData.stops || routeData.stops.length === 0 ? (
          <div className="py-10 text-center text-xs text-text-muted">
            No active field stops found to optimize.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Route Summary Metrics Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-purple-500/15 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-cyan-500/5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Optimized Multi-Stop Route
                  </span>
                </div>
                <p className="text-xs text-text-secondary">
                  Start: <span className="font-bold text-text-primary">{routeData.summary.startLocation}</span>
                </p>
                <div className="flex items-center gap-4 text-xs pt-1">
                  <span className="font-bold text-text-primary flex items-center gap-1">
                    <Car className="h-3.5 w-3.5 text-cyan-400" /> {routeData.summary.totalMiles} Total Miles
                  </span>
                  <span className="font-bold text-text-primary flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" /> ~{routeData.summary.estimatedTotalDriveTime} Drive Time
                  </span>
                  <span className="font-bold text-text-primary flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-purple-400" /> {routeData.summary.totalStops} Stops
                  </span>
                </div>
              </div>

              {/* Direct Navigation Action */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <a
                  href={routeData.summary.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all whitespace-nowrap"
                >
                  <Navigation className="h-4 w-4" />
                  Open in Google Maps
                </a>
              </div>
            </div>

            {/* Ordered Stop Timeline */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-text-muted px-1">
                Optimized Turn-by-Turn Stop Sequence
              </h4>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {routeData.stops.map((stop: any, idx: number) => (
                  <div
                    key={stop.id}
                    className="p-3.5 rounded-xl bg-surface border border-border-subtle hover:border-cyan-500/30 transition-all flex items-start gap-3.5 group relative"
                  >
                    {/* Stop Number Badge */}
                    <div className="h-7 w-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                      {stop.stopNumber}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="text-xs font-bold text-text-primary group-hover:text-cyan-400 transition-colors">
                            {stop.fullAddress}
                          </h5>
                          <p className="text-[11px] text-cyan-300 font-semibold">
                            {stop.serviceType || "Property Preservation"} • {stop.title}
                          </p>
                        </div>

                        <span className="text-[11px] font-bold text-text-muted flex-shrink-0 bg-surface-hover px-2 py-0.5 rounded">
                          +{stop.distanceFromPreviousMiles} mi (~{stop.estimatedDriveMins}m)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-muted pt-1">
                        {stop.lockCode && (
                          <span className="flex items-center gap-1 font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            <Key className="h-3 w-3" /> Lock: {stop.lockCode}
                          </span>
                        )}
                        {stop.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-text-dim" /> Due: {new Date(stop.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        <a
                          href={`/dashboard/work-orders/${stop.workOrderId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline flex items-center gap-0.5 font-bold"
                        >
                          View Order <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
