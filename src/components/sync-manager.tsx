"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { getPendingMutations, removeMutation } from "@/lib/idb";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export function SyncManager() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Check initial status
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online. Syncing changes...");
      syncNow();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are offline. Changes will be saved locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("Service Worker registered:", reg.scope);
      }).catch((err) => {
        console.error("Service Worker registration failed:", err);
      });
    }

    // Periodically check for pending mutations
    const interval = setInterval(async () => {
      try {
        const mutations = await getPendingMutations();
        setPendingCount(mutations.length);
      } catch (err) {}
    }, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  async function syncNow() {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const mutations = await getPendingMutations();
      for (const mutation of mutations) {
        try {
          const res = await fetch(mutation.url, {
            method: mutation.method,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(mutation.body),
          });
          if (res.ok) {
            await removeMutation(mutation.id);
          }
        } catch (e) {
          console.error("Manual sync failed for mutation", mutation.id, e);
        }
      }
      const remaining = await getPendingMutations();
      setPendingCount(remaining.length);
      if (remaining.length === 0 && mutations.length > 0) {
        toast.success("All offline changes synced!");
      }
    } finally {
      setSyncing(false);
    }
  }

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 flex items-center gap-3 px-4 py-2 rounded-full shadow-lg border backdrop-blur-md text-sm font-medium transition-all duration-300",
        isOnline
          ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
          : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          Offline Mode
        </>
      ) : (
        <>
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          Syncing ({pendingCount})
        </>
      )}
      
      {pendingCount > 0 && !syncing && isOnline && (
        <button
          onClick={syncNow}
          className="ml-2 px-2 py-1 text-xs bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
        >
          Sync Now
        </button>
      )}
    </div>
  );
}
