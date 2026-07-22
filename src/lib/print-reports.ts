/**
 * Professional Print & PDF Report Generator for Property Preservation Tasks and Bids
 * Optimized for Mobile (iOS Safari, Android Chrome, PWAs, WebViews) and Desktop
 */

export interface ReportTaskItem {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
  completedAt?: string;
  status?: string;
  unit?: string;
  quantity?: number;
  price?: number;
  photos?: any[];
}

export interface ReportBidItem {
  id: string;
  title: string;
  description?: string;
  status?: string;
  amount: number;
  unit?: string;
  quantity?: number;
  price?: number;
  photos?: any[];
}

/**
 * Normalizes relative API/file URLs into absolute HTTPS URLs so print windows & hidden iframes load photos properly.
 */
export function getAbsolutePhotoUrl(photo: any): string {
  const url = photo?.url || photo?.rawUrl || photo?.path || (typeof photo === "string" ? photo : "");
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

/**
 * Helper to compress and resize a base64 image data URL to prevent
 * iOS Share Sheet PDF generator from crashing due to memory limits with massive HTML strings.
 */
function resizeBase64Image(dataUrl: string, maxWidth = 800): Promise<string> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(dataUrl);
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7)); // compress to 70% quality
    };
    img.onerror = () => resolve(dataUrl); // fallback if image fails to load in canvas
    img.src = dataUrl;
  });
}

/**
 * Helper to convert any image URL (including local blob: URLs) to a base64 data URI,
 * and aggressively resize it for PDF export.
 */
export async function imageToBase64(url: string): Promise<string> {
  if (!url) return "";
  try {
    let base64Data = url;
    
    // If it's not already a data URI, we need to fetch it first
    if (!url.startsWith("data:")) {
      let fetchUrl = url;
      // Proxy ALL HTTP image requests to bypass browser CORS constraints.
      if (url.startsWith("http") && typeof window !== "undefined") {
        fetchUrl = `${window.location.origin}/api/proxy-image?url=${encodeURIComponent(url)}`;
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} from image fetch`);

      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) {
         throw new Error(`Invalid content type: ${blob.type}`);
      }

      base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    // Always resize and compress the image before embedding it in the HTML
    // to prevent memory crashes on iOS PDF generator.
    if (typeof document !== "undefined") {
      base64Data = await resizeBase64Image(base64Data, 800);
    }
    
    return base64Data;
  } catch (err: any) {
    console.warn("Could not convert image to base64 for PDF export:", url, err);
    // Generate an SVG error image so we can see the error directly in the PDF
    const safeUrl = url.substring(0, 40).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeErr = (err.message || "Unknown error").substring(0, 60).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150">
      <rect width="100%" height="100%" fill="#fee2e2"/>
      <text x="10" y="30" font-size="12" fill="#991b1b" font-family="monospace" font-weight="bold">Image Error</text>
      <text x="10" y="55" font-size="10" fill="#991b1b" font-family="monospace">${safeErr}</text>
      <text x="10" y="80" font-size="10" fill="#991b1b" font-family="monospace">${safeUrl}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${typeof btoa !== "undefined" ? btoa(svg) : Buffer.from(svg).toString("base64")}`;
  }
}

/**
 * Universal print trigger optimized for Desktop, iOS Safari, Android Chrome, PWAs, and WebViews.
 * Respects Mobile Safe Areas (iPhone Notch/Dynamic Island), strips duplicate inner toolbars, 
 * and provides robust native AirPrint, PDF Save, and Web Share actions.
 */
export function executePrint(html: string, titleName: string = "Property Preservation Report") {
  if (typeof window === "undefined") return;

  // Clean HTML: Remove redundant inner toolbars when rendering inside viewer modal
  const cleanHtml = html.replace(/<div class="toolbar no-print">[\s\S]*?<\/div>/gi, "");

  const blob = new Blob([cleanHtml], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  // Function to wait for images in a window/doc to finish loading
  const triggerPrintWhenImagesLoaded = (win: Window, doc: Document) => {
    const imgs = Array.from(doc.querySelectorAll("img"));
    if (imgs.length === 0) {
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch (e) {}
      }, 300);
      return;
    }

    let loadedCount = 0;
    const totalImgs = imgs.length;

    const checkComplete = () => {
      loadedCount++;
      if (loadedCount >= totalImgs) {
        setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch (e) {}
        }, 300);
      }
    };

    imgs.forEach((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        checkComplete();
      } else {
        img.addEventListener("load", checkComplete);
        img.addEventListener("error", checkComplete);
      }
    });

    // Safety fallback timeout
    setTimeout(() => {
      if (loadedCount < totalImgs) {
        try {
          win.focus();
          win.print();
        } catch (e) {}
      }
    }, 2500);
  };

  const isMobile =
    typeof navigator !== "undefined" &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true);

  // 1. Desktop Window Opening
  if (!isMobile) {
    let printWindow: Window | null = null;
    try {
      printWindow = window.open(blobUrl, "_blank");
    } catch (e) {
      printWindow = null;
    }

    if (printWindow && !printWindow.closed && typeof printWindow.closed !== "undefined") {
      try {
        printWindow.focus();
        triggerPrintWhenImagesLoaded(printWindow, printWindow.document);
        return;
      } catch (err) {
        console.warn("Popup focus warning:", err);
      }
    }
  }

  // 2. Mobile / PWA / Standalone App Fallback: Full-screen Safe-Area Compliant Modal
  const existingModal = document.getElementById("mobile-print-preview-modal");
  if (existingModal) existingModal.remove();

  const overlay = document.createElement("div");
  overlay.id = "mobile-print-preview-modal";
  overlay.style.cssText =
    "position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;display:flex;flex-direction:column;background:#090d16;font-family:-apple-system,BlinkMacSystemFont,sans-serif;";

  overlay.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding-top:max(env(safe-area-inset-top, 20px), 16px);padding-bottom:12px;padding-left:max(env(safe-area-inset-left, 16px), 16px);padding-right:max(env(safe-area-inset-right, 16px), 16px);background:#0f172a;border-bottom:1px solid #1e293b;color:#fff;">
      <div style="display:flex;align-items:center;gap:10px;overflow:hidden;flex:1;margin-right:8px;">
        <span style="font-size:18px;flex-shrink:0;">📄</span>
        <div style="overflow:hidden;">
          <div style="font-size:13px;font-weight:900;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${titleName}</div>
          <div style="font-size:9px;color:#38bdf8;font-weight:700;">Mobile PWA Print & PDF Viewer</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
        <button id="mobile-print-action-btn" style="background:linear-gradient(135deg,#06b6d4,#0284c7);color:#ffffff;border:none;font-weight:800;padding:8px 12px;border-radius:10px;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;box-shadow:0 4px 12px rgba(6,182,212,0.3);">
          🖨️ Print / Save PDF
        </button>
        <button id="mobile-close-action-btn" style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.4);font-weight:800;padding:8px 10px;border-radius:10px;font-size:11px;cursor:pointer;">
          ✕
        </button>
      </div>
    </div>
    <div style="flex:1;width:100%;height:100%;overflow:hidden;background:#f8fafc;-webkit-overflow-scrolling:touch;">
      <iframe id="mobile-print-iframe-element" src="${blobUrl}" style="width:100%;height:100%;border:none;" />
    </div>
  `;

  document.body.appendChild(overlay);

  const iframeEl = document.getElementById("mobile-print-iframe-element") as HTMLIFrameElement;
  const printBtn = document.getElementById("mobile-print-action-btn");
  const closeBtn = document.getElementById("mobile-close-action-btn");

  closeBtn?.addEventListener("click", () => overlay.remove());

  const handleMobilePrintOrShare = async () => {
    // In iOS PWAs (Standalone mode), `window.open` is often blocked and `blob:` navigation fails.
    // The ultimate robust fallback for iOS Safari/PWAs is to inject the print HTML into the current DOM,
    // use @media print to hide everything else, call window.print(), and then clean up!
    
    // 1. Create a temporary container for the print content
    const printContainer = document.createElement("div");
    printContainer.id = "pwa-print-container";
    
    // Extract the styles and body content from the HTML string (since we can't inject a full HTML doc easily)
    // Browsers will naturally strip <html> tags when assigned to innerHTML, but it's safer to just inject it directly.
    printContainer.innerHTML = cleanHtml;
    
    // 2. Create a style tag to hide the rest of the app during printing
    const printStyle = document.createElement("style");
    printStyle.id = "pwa-print-style";
    printStyle.innerHTML = `
      @media print {
        body > *:not(#pwa-print-container) {
          display: none !important;
        }
        #pwa-print-container {
          display: block !important;
          width: 100%;
          margin: 0;
          padding: 0;
        }
        @page { margin: 0; }
      }
      @media screen {
        #pwa-print-container {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(printStyle);
    document.body.appendChild(printContainer);

    // 3. Trigger native print dialog
    setTimeout(() => {
      window.print();
      
      // 4. Cleanup after the print dialog is closed (or immediately after it opens, since print is blocking/sync on many browsers)
      // We give it a generous timeout to ensure the print spooler grabs the DOM before we destroy it.
      setTimeout(() => {
        if (document.getElementById("pwa-print-container")) {
          document.body.removeChild(printContainer);
        }
        if (document.getElementById("pwa-print-style")) {
          document.head.removeChild(printStyle);
        }
      }, 2000);
    }, 100);
  };

  printBtn?.addEventListener("click", handleMobilePrintOrShare);
}

/**
 * Generates and prints a colorful, professional PDF/Print report for Tasks with embedded Before, During & After photos.
 */
export async function printTasksReport(tasks: ReportTaskItem[], workOrderNumber: string = "WO-SUMMARY") {
  if (!tasks || tasks.length === 0) return;

  // Deduplicate tasks to ensure no single task is rendered twice
  const uniqueTasksMap = new Map<string, ReportTaskItem>();
  tasks.forEach((t, i) => {
    const key = t.id ? String(t.id) : `${t.title}-${t.price || 0}-${i}`;
    if (!uniqueTasksMap.has(key)) {
      uniqueTasksMap.set(key, t);
    }
  });
  
  // Pre-process tasks: convert all photos to Base64 so they render reliably in iOS Share Sheet / PDF
  let uniqueTasks = Array.from(uniqueTasksMap.values());
  uniqueTasks = await Promise.all(
    uniqueTasks.map(async (t) => {
      if (!t.photos || t.photos.length === 0) return t;
      const processedPhotos = await Promise.all(
        t.photos.map(async (p) => {
          const absUrl = getAbsolutePhotoUrl(p);
          const b64 = await imageToBase64(absUrl);
          return { ...p, base64Data: b64 };
        })
      );
      return { ...t, photos: processedPhotos };
    })
  );

  const isSingleItem = uniqueTasks.length === 1;

  const totalCost = uniqueTasks.reduce((sum, t) => {
    const qty = t.quantity ?? 1;
    const price = t.price ?? 0;
    return sum + (t.price != null ? qty * price : 0);
  }, 0);

  const completedCount = uniqueTasks.filter((t) => t.completed || t.status === "COMPLETED").length;
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <base href="${origin}/" />
  <title>Task Report - #${workOrderNumber}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #f8fafc; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .no-print { display: none !important; }
      .page-break { page-break-inside: avoid; }
    }
    .toolbar { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 12px 20px; border-radius: 12px; margin-bottom: 24px; }
    .btn { background: #06b6d4; color: #000; border: none; font-weight: 700; padding: 8px 16px; border-radius: 8px; cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    .btn-secondary { background: rgba(255,255,255,0.2); color: #fff; margin-left: 8px; }
    
    .header-card { background: linear-gradient(135deg, #0e7490 0%, #15803d 100%); color: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(14,116,144,0.3); }
    .header-title { font-size: 24px; font-weight: 900; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px; }
    .header-sub { font-size: 13px; opacity: 0.9; margin: 0; }

    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; pt: 16px; border-top: 1px solid rgba(255,255,255,0.2); }
    .metric-box { background: rgba(255,255,255,0.12); padding: 10px 14px; border-radius: 10px; }
    .metric-val { font-size: 20px; font-weight: 800; }
    .metric-lbl { font-size: 10px; text-transform: uppercase; opacity: 0.85; font-weight: 600; }

    .table-container { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #0f172a; color: #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; }
    td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }

    .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-completed { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

    .task-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 16px; page-break-inside: avoid; }
    .task-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .task-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; }
    .task-desc { font-size: 12px; color: #475569; margin-top: 6px; line-height: 1.5; }
    .task-price { font-size: 16px; font-weight: 800; color: #059669; }

    .photo-section { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #e2e8f0; }
    .photo-stage-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 10px 0 6px 0; color: #0284c7; }
    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-bottom: 10px; }
    .photo-item { border-radius: 8px; overflow: hidden; border: 1px solid #cbd5e1; background: #f1f5f9; position: relative; height: 110px; }
    .photo-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .photo-tag { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.75); color: #fff; font-size: 8px; padding: 2px 4px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <div>
      <strong style="font-size:14px;">Work Order Task Report (#${workOrderNumber})</strong>
    </div>
    <div>
      <button class="btn" onclick="window.print()">🖨️ Print / Export PDF</button>
      <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>
  </div>

  <div class="header-card">
    <h1 class="header-title">${isSingleItem ? "TASK DETAIL REPORT" : "PROPERTY PRESERVATION TASKS REPORT"}</h1>
    <p class="header-sub">Work Order #${workOrderNumber} • Generated on ${dateStr}</p>
    
    <div class="metrics-grid">
      <div class="metric-box">
        <div class="metric-val">${tasks.length}</div>
        <div class="metric-lbl">Total Tasks</div>
      </div>
      <div class="metric-box">
        <div class="metric-val">${completedCount}</div>
        <div class="metric-lbl">Completed</div>
      </div>
      <div class="metric-box">
        <div class="metric-val">${tasks.length - completedCount}</div>
        <div class="metric-lbl">Pending</div>
      </div>
      <div class="metric-box">
        <div class="metric-val">$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="metric-lbl">Total Value</div>
      </div>
    </div>
  </div>

  ${!isSingleItem ? `
  <!-- Tasks Summary Table (Concise Titles & Quantities) -->
  <div class="table-container page-break">
    <table>
      <thead>
        <tr>
          <th style="width:40px;">#</th>
          <th>Task Title</th>
          <th>Status</th>
          <th style="text-align:right;">Qty / Unit</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.map((t, idx) => {
          const qty = t.quantity ?? 1;
          const price = t.price ?? 0;
          const total = t.price != null ? qty * price : 0;
          const isDone = t.completed || t.status === "COMPLETED";

          return `<tr>
            <td><strong>${idx + 1}</strong></td>
            <td><div style="font-weight:700; color:#0f172a;">${t.title}</div></td>
            <td>
              <span class="badge ${isDone ? "badge-completed" : "badge-pending"}">
                ${isDone ? "COMPLETED" : "PENDING"}
              </span>
            </td>
            <td style="text-align:right; font-weight:600;">${t.quantity != null ? `${t.quantity} ${t.unit || ""}` : "-"}</td>
            <td style="text-align:right; font-weight:600;">${t.price != null ? `$${t.price.toFixed(2)}` : "-"}</td>
            <td style="text-align:right; font-weight:800; color:#059669;">${t.price != null ? `$${total.toFixed(2)}` : "-"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <!-- Detailed Task Cards with Full Description & Photos -->
  <h2 style="font-size:16px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin:24px 0 12px 0; color:#0f172a;">
    ${isSingleItem ? "Task Scope & Photo Documentation" : "Detailed Scope & Photo Documentation"}
  </h2>

  ${tasks.map((t, idx) => {
    const beforePhotos = t.photos?.filter(p => p.category === "BEFORE") || [];
    const duringPhotos = t.photos?.filter(p => p.category === "DURING") || [];
    const afterPhotos = t.photos?.filter(p => p.category === "AFTER") || [];
    const generalPhotos = t.photos?.filter(p => !p.category || (p.category !== "BEFORE" && p.category !== "DURING" && p.category !== "AFTER")) || [];

    const qty = t.quantity ?? 1;
    const price = t.price ?? 0;
    const total = t.price != null ? qty * price : 0;
    const isDone = t.completed || t.status === "COMPLETED";

    return `<div class="task-card">
      <div class="task-header">
        <div>
          <span style="font-size:11px; font-weight:800; color:#0284c7; text-transform:uppercase;">Task #${idx + 1}</span>
          <h3 class="task-title">${t.title}</h3>
          ${t.description ? `<p class="task-desc">${t.description}</p>` : ""}
        </div>
        <div style="text-align:right;">
          <span class="badge ${isDone ? "badge-completed" : "badge-pending"}">${isDone ? "COMPLETED" : "PENDING"}</span>
          ${t.price != null ? `<div class="task-price" style="margin-top:4px;">$${total.toFixed(2)}</div>` : ""}
        </div>
      </div>

      ${t.unit || t.quantity != null || t.price != null ? `
        <div style="font-size:11px; font-weight:700; color:#0e7490; background:#ecfeff; padding:6px 10px; border-radius:6px; margin-top:8px; display:inline-block;">
          Unit Calculation: ${t.quantity || 1} ${t.unit || "ea"} × $${(t.price || 0).toFixed(2)} = $${total.toFixed(2)}
        </div>
      ` : ""}

      ${t.photos && t.photos.length > 0 ? `
        <div class="photo-section">
          ${beforePhotos.length > 0 ? `
            <div class="photo-stage-title">📸 Before Remediation Photos (${beforePhotos.length})</div>
            <div class="photo-grid">
              ${beforePhotos.map(p => `
                <div class="photo-item">
                  <img src="${p.base64Data || getAbsolutePhotoUrl(p)}" class="photo-img" />
                  <div class="photo-tag">${p.name || "Before Photo"}</div>
                </div>
              `).join("")}
            </div>
          ` : ""}

          ${duringPhotos.length > 0 ? `
            <div class="photo-stage-title">🛠️ During Work Photos (${duringPhotos.length})</div>
            <div class="photo-grid">
              ${duringPhotos.map(p => `
                <div class="photo-item">
                  <img src="${p.base64Data || getAbsolutePhotoUrl(p)}" class="photo-img" />
                  <div class="photo-tag">${p.name || "During Photo"}</div>
                </div>
              `).join("")}
            </div>
          ` : ""}

          ${afterPhotos.length > 0 ? `
            <div class="photo-stage-title">✅ After Completion Photos (${afterPhotos.length})</div>
            <div class="photo-grid">
              ${afterPhotos.map(p => `
                <div class="photo-item">
                  <img src="${p.base64Data || getAbsolutePhotoUrl(p)}" class="photo-img" />
                  <div class="photo-tag">${p.name || "After Photo"}</div>
                </div>
              `).join("")}
            </div>
          ` : ""}

          ${generalPhotos.length > 0 ? `
            <div class="photo-stage-title">📷 General Documentation Photos (${generalPhotos.length})</div>
            <div class="photo-grid">
              ${generalPhotos.map(p => `
                <div class="photo-item">
                  <img src="${p.base64Data || getAbsolutePhotoUrl(p)}" class="photo-img" />
                  <div class="photo-tag">${p.name || "Photo"}</div>
                </div>
              `).join("")}
            </div>
          ` : ""}
        </div>
      ` : `<div style="font-size:11px; color:#94a3b8; font-style:italic; margin-top:8px;">No photos attached for this task.</div>`}
    </div>`;
  }).join("")}

</body>
</html>`;

  executePrint(html);
}

/**
 * Generates and prints a colorful, professional PDF/Print financial bid proposal report with bid documentation photos.
 */
export async function printBidsReport(bids: ReportBidItem[], workOrderNumber: string = "WO-SUMMARY") {
  if (!bids || bids.length === 0) return;

  // Deduplicate bids to ensure no single bid item is printed twice
  const uniqueBidsMap = new Map<string, ReportBidItem>();
  bids.forEach((b, i) => {
    const key = b.id ? String(b.id) : `${b.title}-${b.amount || 0}-${i}`;
    if (!uniqueBidsMap.has(key)) {
      uniqueBidsMap.set(key, b);
    }
  });

  // Pre-process bids: convert all photos to Base64 so they render reliably in iOS Share Sheet / PDF
  let uniqueBids = Array.from(uniqueBidsMap.values());
  uniqueBids = await Promise.all(
    uniqueBids.map(async (b) => {
      if (!b.photos || b.photos.length === 0) return b;
      const processedPhotos = await Promise.all(
        b.photos.map(async (p) => {
          const absUrl = getAbsolutePhotoUrl(p);
          const b64 = await imageToBase64(absUrl);
          return { ...p, base64Data: b64 };
        })
      );
      return { ...b, photos: processedPhotos };
    })
  );

  const isSingleItem = uniqueBids.length === 1;

  const totalAmount = uniqueBids.reduce((sum, b) => sum + (b.amount || 0), 0);
  const approvedCount = uniqueBids.filter((b) => b.status === "APPROVED").length;
  const pendingCount = uniqueBids.filter((b) => b.status === "PENDING" || !b.status).length;
  
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <base href="${origin}/" />
  <title>Financial Bid Proposal - #${workOrderNumber}</title>
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #f8fafc; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .no-print { display: none !important; }
      .page-break { page-break-inside: avoid; }
    }
    .toolbar { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 12px 20px; border-radius: 12px; margin-bottom: 24px; }
    .btn { background: #10b981; color: #000; border: none; font-weight: 700; padding: 8px 16px; border-radius: 8px; cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    .btn-secondary { background: rgba(255,255,255,0.2); color: #fff; margin-left: 8px; }
    
    .header-card { background: linear-gradient(135deg, #059669 0%, #0284c7 100%); color: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(5,150,105,0.3); }
    .header-title { font-size: 24px; font-weight: 900; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px; }
    .header-sub { font-size: 13px; opacity: 0.9; margin: 0; }

    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; pt: 16px; border-top: 1px solid rgba(255,255,255,0.2); }
    .metric-box { background: rgba(255,255,255,0.12); padding: 10px 14px; border-radius: 10px; }
    .metric-val { font-size: 20px; font-weight: 800; }
    .metric-lbl { font-size: 10px; text-transform: uppercase; opacity: 0.85; font-weight: 600; }

    .table-container { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #0f172a; color: #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; }
    td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }

    .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-approved { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-rejected { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }

    .bid-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 16px; page-break-inside: avoid; }
    .bid-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .bid-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; }
    .bid-desc { font-size: 12px; color: #475569; margin-top: 6px; line-height: 1.5; }
    .bid-price { font-size: 18px; font-weight: 900; color: #059669; }

    .photo-section { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #e2e8f0; }
    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin-top: 8px; }
    .photo-item { border-radius: 8px; overflow: hidden; border: 1px solid #cbd5e1; background: #f1f5f9; position: relative; height: 110px; }
    .photo-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .photo-tag { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.75); color: #fff; font-size: 8px; padding: 2px 4px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <div>
      <strong style="font-size:14px;">Financial Bid Proposal Report (#${workOrderNumber})</strong>
    </div>
    <div>
      <button class="btn" onclick="window.print()">🖨️ Print / Export PDF</button>
      <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>
  </div>

  <div class="header-card">
    <h1 class="header-title">${isSingleItem ? "BID ITEM PROPOSAL REPORT" : "FINANCIAL BIDS PROPOSAL"}</h1>
    <p class="header-sub">Work Order #${workOrderNumber} • Generated on ${dateStr}</p>
    
    <div class="metrics-grid">
      <div class="metric-box">
        <div class="metric-val">${uniqueBids.length}</div>
        <div class="metric-lbl">Total Bid Items</div>
      </div>
      <div class="metric-box">
        <div class="metric-val">${approvedCount}</div>
        <div class="metric-lbl">Approved</div>
      </div>
      <div class="metric-box">
        <div class="metric-val">${pendingCount}</div>
        <div class="metric-lbl">Pending Review</div>
      </div>
      <div class="metric-box">
        <div class="metric-val">$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="metric-lbl">Projected Value</div>
      </div>
    </div>
  </div>

  ${!isSingleItem ? `
  <!-- Line Items Table Summary (Concise Financial Line-Items) -->
  <div class="table-container page-break">
    <table>
      <thead>
        <tr>
          <th style="width:40px;">#</th>
          <th>Bid Item Title</th>
          <th>Status</th>
          <th style="text-align:right;">Qty / Unit</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${uniqueBids.map((b, idx) => {
          const statusClass = b.status === "APPROVED" ? "badge-approved" : b.status === "REJECTED" ? "badge-rejected" : "badge-pending";

          return `<tr>
            <td><strong>${idx + 1}</strong></td>
            <td><div style="font-weight:700; color:#0f172a;">${b.title}</div></td>
            <td>
              <span class="badge ${statusClass}">${b.status || "PENDING"}</span>
            </td>
            <td style="text-align:right; font-weight:600;">${b.quantity != null ? `${b.quantity} ${b.unit || ""}` : "-"}</td>
            <td style="text-align:right; font-weight:600;">${b.price != null ? `$${b.price.toFixed(2)}` : "-"}</td>
            <td style="text-align:right; font-weight:800; color:#059669;">$${b.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <!-- Individual Bid Detail Cards with Description & Photos -->
  <h2 style="font-size:16px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin:24px 0 12px 0; color:#0f172a;">
    ${isSingleItem ? "Bid Justification & Evidence Photos" : "Detailed Justification & Evidence Photos"}
  </h2>

  ${uniqueBids.map((b, idx) => {
    const statusClass = b.status === "APPROVED" ? "badge-approved" : b.status === "REJECTED" ? "badge-rejected" : "badge-pending";

    return `<div class="bid-card">
      <div class="bid-header">
        <div>
          <span style="font-size:11px; font-weight:800; color:#059669; text-transform:uppercase;">Bid Item #${idx + 1}</span>
          <h3 class="bid-title">${b.title}</h3>
          ${b.description ? `<p class="bid-desc">${b.description}</p>` : ""}
        </div>
        <div style="text-align:right;">
          <span class="badge ${statusClass}">${b.status || "PENDING"}</span>
          <div class="bid-price" style="margin-top:4px;">$${b.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      ${b.unit || b.quantity != null || b.price != null ? `
        <div style="font-size:11px; font-weight:700; color:#0e7490; background:#ecfeff; padding:6px 10px; border-radius:6px; margin-top:8px; display:inline-block;">
          Unit Calculation: ${b.quantity || 1} ${b.unit || "ea"} × $${(b.price || b.amount).toFixed(2)} = $${b.amount.toFixed(2)}
        </div>
      ` : ""}

      ${b.photos && b.photos.length > 0 ? `
        <div class="photo-section">
          <div style="font-size:11px; font-weight:800; text-transform:uppercase; color:#475569;">📷 Bid Evidence Photos (${b.photos.length})</div>
          <div class="photo-grid">
            ${b.photos.map(p => `
              <div class="photo-item">
                <img src="${p.base64Data || getAbsolutePhotoUrl(p)}" class="photo-img" />
                <div class="photo-tag">${p.name || "Bid Photo"}</div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : `<div style="font-size:11px; color:#94a3b8; font-style:italic; margin-top:8px;">No photos attached for this bid item.</div>`}
    </div>`;
  }).join("")}

</body>
</html>`;

  executePrint(html);
}
