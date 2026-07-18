"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { getPendingMutations, removeMutation } from "@/lib/idb";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export function SyncManager() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Define syncNow inside useEffect or use useCallback, but we also use it in the button.
  // We'll wrap it in useCallback or just use an internal function inside useEffect for the listener.
  // Actually, we can just omit it from deps if we disable the lint, or wrap in useCallback.

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online. Syncing changes...");
      syncNow();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("You are offline. Changes will be saved locally.", { icon: "⚠️" });
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
      } catch {
        // ignore errors
      }
    }, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncNow() {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      // 1. Sync Mutations
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

      // 2. Sync Offline Photos
      const { getQueuedPhotos, removePhotoFromQueue } = await import("@/lib/offline-queue");
      const queuedPhotos = await getQueuedPhotos();
      let photoSuccessCount = 0;
      
      for (const photo of queuedPhotos) {
        try {
          const formData = new FormData();
          formData.append("file", photo.file);
          formData.append("category", photo.category);
          formData.append("isOfflineSync", "true");

          const res = await fetch(`/api/work-orders/${photo.workOrderId}/files`, {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            await removePhotoFromQueue(photo.id);
            photoSuccessCount++;
          }
        } catch (e) {
          console.error("Failed to sync offline photo:", e);
        }
      }

      const remainingMutations = await getPendingMutations();
      const remainingPhotos = await getQueuedPhotos();
      setPendingCount(remainingMutations.length + remainingPhotos.length);
      
      if (remainingMutations.length === 0 && remainingPhotos.length === 0 && (mutations.length > 0 || queuedPhotos.length > 0)) {
        toast.success("All offline changes synced!");
        queryClient.invalidateQueries();
      } else if (photoSuccessCount > 0) {
        toast.success(`Successfully synced ${photoSuccessCount} offline photos!`);
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
