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
 * Universal print trigger that waits for all images to finish downloading before triggering native print preview.
 */
function executePrint(html: string) {
  if (typeof window === "undefined") return;

  // Function to wait for images to load before calling print()
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

    // Safety timeout after 2.5 seconds
    setTimeout(() => {
      if (loadedCount < totalImgs) {
        try {
          win.focus();
          win.print();
        } catch (e) {}
      }
    }, 2500);
  };

  // 1. Try window.open first (Desktop default)
  let printWindow: Window | null = null;
  try {
    printWindow = window.open("", "_blank");
  } catch (e) {
    printWindow = null;
  }

  // 2. If window.open was blocked (iOS Safari / Android Chrome / Mobile PWAs), use hidden iframe
  if (!printWindow || printWindow.closed || typeof printWindow.closed === "undefined") {
    let iframe = document.getElementById("mobile-print-frame") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "mobile-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.zIndex = "-9999";
      document.body.appendChild(iframe);
    }

    const iframeWin = iframe.contentWindow;
    const doc = iframeWin?.document || iframe.contentDocument;
    if (doc && iframeWin) {
      doc.open();
      doc.write(html);
      doc.close();
      triggerPrintWhenImagesLoaded(iframeWin, doc);
    }
    return;
  }

  // 3. Desktop Popup Window
  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    triggerPrintWhenImagesLoaded(printWindow, printWindow.document);
  } catch (err) {
    console.error("Popup document write error:", err);
  }
}

/**
 * Generates and prints a colorful, professional PDF/Print report for Tasks with embedded Before, During & After photos.
 */
export function printTasksReport(tasks: ReportTaskItem[], workOrderNumber: string = "WO-SUMMARY") {
  if (!tasks || tasks.length === 0) return;

  // Deduplicate tasks to ensure no single task is rendered twice
  const uniqueTasksMap = new Map<string, ReportTaskItem>();
  tasks.forEach((t, i) => {
    const key = t.id ? String(t.id) : `${t.title}-${t.price || 0}-${i}`;
    if (!uniqueTasksMap.has(key)) {
      uniqueTasksMap.set(key, t);
    }
  });
  const uniqueTasks = Array.from(uniqueTasksMap.values());
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
                  <img src="${getAbsolutePhotoUrl(p)}" class="photo-img" />
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
                  <img src="${getAbsolutePhotoUrl(p)}" class="photo-img" />
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
                  <img src="${getAbsolutePhotoUrl(p)}" class="photo-img" />
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
                  <img src="${getAbsolutePhotoUrl(p)}" class="photo-img" />
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
export function printBidsReport(bids: ReportBidItem[], workOrderNumber: string = "WO-SUMMARY") {
  if (!bids || bids.length === 0) return;

  // Deduplicate bids to ensure no single bid item is printed twice
  const uniqueBidsMap = new Map<string, ReportBidItem>();
  bids.forEach((b, i) => {
    const key = b.id ? String(b.id) : `${b.title}-${b.amount || 0}-${i}`;
    if (!uniqueBidsMap.has(key)) {
      uniqueBidsMap.set(key, b);
    }
  });
  const uniqueBids = Array.from(uniqueBidsMap.values());
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
                <img src="${getAbsolutePhotoUrl(p)}" class="photo-img" />
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
