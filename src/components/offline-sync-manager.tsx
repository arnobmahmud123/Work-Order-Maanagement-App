"use client";

import { useEffect, useState } from "react";
import { getQueuedPhotos, removePhotoFromQueue } from "@/lib/offline-queue";
import { toast } from "react-hot-toast";

export function OfflineSyncManager() {
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const handleOnline = async () => {
      if (isSyncing) return;
      setIsSyncing(true);

      try {
        const queuedPhotos = await getQueuedPhotos();
        if (!queuedPhotos || queuedPhotos.length === 0) {
          setIsSyncing(false);
          return;
        }

        toast(`Syncing ${queuedPhotos.length} offline photos...`, { icon: "🔄" });
        let successCount = 0;

        for (const photo of queuedPhotos) {
          try {
            // Re-use the existing logic by sending the photo to the API
            // Note: Normally we would just re-call the handlePhotoUpload logic,
            // but since that's in the page component, we'll re-implement the DB/R2 upload here or use the fallback route.
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
              successCount++;
            }
          } catch (e) {
            console.error("Failed to sync offline photo:", e);
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully synced ${successCount} offline photos!`);
        }
      } finally {
        setIsSyncing(false);
      }
    };

    window.addEventListener("online", handleOnline);

    // Also try to sync on initial load if online
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [isSyncing]);

  return null;
}
