// Utility for robust file downloads across Web, iOS Safari, Android Chrome, and Capacitor WebViews

export async function triggerFileDownload(blobOrUrl: Blob | string, filename: string) {
  try {
    let blob: Blob;
    if (typeof blobOrUrl === "string") {
      // If data URL, convert directly
      if (blobOrUrl.startsWith("data:")) {
        const res = await fetch(blobOrUrl);
        blob = await res.blob();
      } else {
        const res = await fetch(blobOrUrl);
        blob = await res.blob();
      }
    } else {
      blob = blobOrUrl;
    }

    const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Try Web Share API on mobile if supported (triggers native "Save Image" / "Save to Files" dialog)
    if (isMobile && typeof navigator !== "undefined" && navigator.canShare && navigator.share) {
      try {
        const mimeType = blob.type || "image/jpeg";
        const ext = filename.split(".").pop() || "jpg";
        const file = new File([blob], filename, { type: mimeType });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
          });
          return;
        }
      } catch (shareErr: any) {
        // User cancelled share or share failed — fall back to standard download below
        if (shareErr.name === "AbortError") return;
      }
    }

    // Standard Blob / DataURL download fallback
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 1000);
    };
    reader.readAsDataURL(blob);
  } catch (err) {
    console.error("File download failed:", err);
    if (typeof blobOrUrl === "string") {
      window.open(blobOrUrl, "_blank");
    }
  }
}

export function downloadSingleBid(bid: any, workOrderNumber?: string) {
  const content = `=====================================================
PROPERTY PRESERVATION BID PROPOSAL
Work Order: #${workOrderNumber || "WO-ITEM"}
Date: ${new Date().toLocaleDateString()}
=====================================================

ITEM TITLE: ${bid.title || "Untitled Bid"}
STATUS: ${bid.status || "PENDING"}
TOTAL AMOUNT: $${(bid.amount || 0).toLocaleString()}
${bid.unit ? `UNIT: ${bid.unit}` : ""}
${bid.quantity != null ? `QUANTITY: ${bid.quantity}` : ""}
${bid.price != null ? `UNIT PRICE: $${bid.price.toFixed(2)}` : ""}

DESCRIPTION:
${bid.description || "No description provided"}

ATTACHED PHOTOS (${bid.photos?.length || 0}):
${bid.photos && bid.photos.length > 0 ? bid.photos.map((p: any, i: number) => `  ${i + 1}. ${p.name || p.originalName || "Photo"} - ${p.url || p.path}`).join("\n") : "  None"}
=====================================================`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  triggerFileDownload(blob, `bid-${(bid.title || "item").toLowerCase().replace(/[^a-z0-9]/g, "-")}.txt`);
}

export function downloadSingleTask(task: any, workOrderNumber?: string) {
  const content = `=====================================================
PROPERTY PRESERVATION TASK DETAILS
Work Order: #${workOrderNumber || "WO-ITEM"}
Date: ${new Date().toLocaleDateString()}
=====================================================

TASK TITLE: ${task.title || "Untitled Task"}
STATUS: ${task.completed ? "COMPLETED" : "PENDING"}
${task.completedAt ? `COMPLETED AT: ${new Date(task.completedAt).toLocaleString()}` : ""}
${task.category ? `CATEGORY: ${task.category}` : ""}
${task.price != null ? `ESTIMATED COST: $${task.price.toFixed(2)}` : ""}

DESCRIPTION / INSTRUCTIONS:
${task.description || "No description provided"}

ATTACHED PHOTOS (${task.photos?.length || 0}):
${task.photos && task.photos.length > 0 ? task.photos.map((p: any, i: number) => `  ${i + 1}. ${p.name || p.originalName || "Photo"} (${p.category || "GENERAL"}) - ${p.url || p.path}`).join("\n") : "  None"}
=====================================================`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  triggerFileDownload(blob, `task-${(task.title || "item").toLowerCase().replace(/[^a-z0-9]/g, "-")}.txt`);
}

export function downloadSingleInspection(item: any, index: number, photos: any[] = [], workOrderNumber?: string) {
  const itemLabel = item.label || item.title || `Item #${index + 1}`;
  const itemPhotos = photos.filter((p: any) => p.name?.startsWith(`compliance-${index}-`) || p.category === "INSPECTION");
  
  const content = `=====================================================
PROPERTY PRESERVATION INSPECTION ITEM REPORT
Work Order: #${workOrderNumber || "WO-ITEM"}
Date: ${new Date().toLocaleDateString()}
=====================================================

INSPECTION ITEM #${index + 1}: ${itemLabel}
STATUS: ${item.completed ? "PASSED / COMPLETED" : "PENDING / ATTENTION REQUIRED"}
REQUIRED: ${item.required ? "YES" : "NO"}

DESCRIPTION / COMPLIANCE NOTES:
${item.description || "Standard property preservation compliance check item."}

INSPECTION EVIDENCE PHOTOS (${itemPhotos.length}):
${itemPhotos.length > 0 ? itemPhotos.map((p: any, i: number) => `  ${i + 1}. ${p.name || p.originalName || "Photo"} - ${p.url || p.path}`).join("\n") : "  No photo evidence attached"}
=====================================================`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  triggerFileDownload(blob, `inspection-item-${index + 1}.txt`);
}
