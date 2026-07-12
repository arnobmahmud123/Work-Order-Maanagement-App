const hasR2Creds =
  !!process.env.R2_ENDPOINT &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY &&
  !!process.env.R2_BUCKET_NAME;

let tempR2Client = null;
if (hasR2Creds) {
  try {
    const { S3Client } = require("@aws-sdk/client-s3");
    tempR2Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
  } catch (e) {
    console.error("Failed to initialize R2 S3Client:", e);
  }
}

export const r2Client = tempR2Client;

/**
 * Extracts the object key (starting with work-orders/) from any known R2 URL format.
 */
function extractR2Key(path: string): string | null {
  try {
    const url = new URL(path);
    const pathname = url.pathname.replace(/^\//, "");
    const keyStart = pathname.indexOf("work-orders/");
    if (keyStart !== -1) {
      return pathname.substring(keyStart);
    }
  } catch {
    const keyStart = path.indexOf("work-orders/");
    if (keyStart !== -1) {
      return path.substring(keyStart);
    }
  }
  return null;
}

function isAlreadyPublicUrl(path: string): boolean {
  const publicBase = process.env.R2_PUBLIC_URL;
  if (!publicBase) return false;
  return path.startsWith(publicBase);
}

// ─── Pure JS Cryptography (SHA-256 / HMAC-SHA256) ───────────────────────────

function sha256(message: string | Uint8Array): Uint8Array {
  const msgBytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
  
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const l = msgBytes.length;
  const bitLen = l * 8;
  
  const padLen = (55 - l % 64 + 64) % 64;
  const padded = new Uint8Array(l + 1 + padLen + 8);
  padded.set(msgBytes, 0);
  padded[l] = 0x80;
  
  const view = new DataView(padded.buffer);
  view.setBigUint64(padded.length - 8, BigInt(bitLen));

  const W = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(offset + t * 4);
    }
    
    for (let t = 16; t < 64; t++) {
      const s0 = (RightRotate(W[t-15], 7) ^ RightRotate(W[t-15], 18) ^ (W[t-15] >>> 3)) >>> 0;
      const s1 = (RightRotate(W[t-2], 17) ^ RightRotate(W[t-2], 19) ^ (W[t-2] >>> 10)) >>> 0;
      W[t] = (W[t-16] + s0 + W[t-7] + s1) >>> 0;
    }
    
    for (let t = 0; t < 64; t++) {
      const S1 = (RightRotate(e, 6) ^ RightRotate(e, 11) ^ RightRotate(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      
      const S0 = (RightRotate(a, 2) ^ RightRotate(a, 13) ^ RightRotate(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const resultView = new DataView(result.buffer);
  for (let i = 0; i < 8; i++) {
    resultView.setUint32(i * 4, H[i]);
  }
  return result;
}

function RightRotate(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function hmacSha256(key: Uint8Array | string, message: string | Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  let keyBytes = typeof key === "string" ? encoder.encode(key) : key;
  const msgBytes = typeof message === "string" ? encoder.encode(message) : message;
  
  if (keyBytes.length > 64) {
    keyBytes = sha256(keyBytes);
  }
  
  const paddedKey = new Uint8Array(64);
  paddedKey.set(keyBytes, 0);
  
  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }
  
  const innerMsg = new Uint8Array(64 + msgBytes.length);
  innerMsg.set(iKeyPad, 0);
  innerMsg.set(msgBytes, 64);
  const innerHash = sha256(innerMsg);
  
  const outerMsg = new Uint8Array(64 + 32);
  outerMsg.set(oKeyPad, 0);
  outerMsg.set(innerHash, 64);
  return sha256(outerMsg);
}

function hashSha256Hex(data: string): string {
  const hash = sha256(data);
  return Array.from(hash).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hmacSha256Hex(key: Uint8Array | string, data: string): string {
  const hash = hmacSha256(key, data);
  return Array.from(hash).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Main URL Signing Logic ────────────────────────────────────────────────

/**
 * Dynamically resolves/signs a Cloudflare R2 path/URL for browser rendering.
 * Uses a pure Javascript SigV4 presigned URL generator to prevent Next.js edge-runtime hangs.
 */
export async function getR2Url(path: string): Promise<string> {
  if (!path) return path;

  // Already renderable by browser
  if (path.startsWith("data:") || path.startsWith("blob:")) return path;

  // Non-HTTP paths
  if (!path.startsWith("http")) return path;

  // Already public CDN URL
  if (isAlreadyPublicUrl(path)) return path;

  // Strategy 1: Rewrite to public CDN URL
  if (process.env.R2_PUBLIC_URL) {
    const key = extractR2Key(path);
    if (key) {
      const publicBase = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
      return `${publicBase}/${key}`;
    }
    return path;
  }

  // Strategy 2: Pre-signed GET URL via pure JS SigV4 presigner
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (endpoint && accessKeyId && secretAccessKey && bucketName) {
    const key = extractR2Key(path);
    if (key) {
      try {
        const datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, ""); // e.g. 20260708T213000Z
        const datestamp = datetime.substring(0, 8); // e.g. 20260708
        const region = "auto";
        const service = "s3";
        
        const endpointUrl = new URL(endpoint);
        const host = endpointUrl.host;
        const cleanKey = key.startsWith("/") ? key.substring(1) : key;
        const uri = `/${bucketName}/${cleanKey}`;
        
        const queryParams = new URLSearchParams({
          "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
          "X-Amz-Credential": `${accessKeyId}/${datestamp}/${region}/${service}/aws4_request`,
          "X-Amz-Date": datetime,
          "X-Amz-Expires": "604800", // 7 days (maximum allowed)
          "X-Amz-SignedHeaders": "host",
        });
        
        queryParams.sort();
        const sortedQuery = queryParams.toString();
        
        const canonicalRequest = [
          "GET",
          uri,
          sortedQuery,
          `host:${host}\n`,
          "host",
          "UNSIGNED-PAYLOAD"
        ].join("\n");
        
        const canonicalRequestHash = hashSha256Hex(canonicalRequest);
        const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
        
        const stringToSign = [
          "AWS4-HMAC-SHA256",
          datetime,
          credentialScope,
          canonicalRequestHash
        ].join("\n");
        
        const kDate = hmacSha256("AWS4" + secretAccessKey, datestamp);
        const kRegion = hmacSha256(kDate, region);
        const kService = hmacSha256(kRegion, service);
        const kSigning = hmacSha256(kService, "aws4_request");
        
        const signature = hmacSha256Hex(kSigning, stringToSign);
        
        return `${endpointUrl.protocol}//${host}${uri}?${sortedQuery}&X-Amz-Signature=${signature}`;
      } catch (err) {
        console.error("[R2 Pure JS Presigner] Failed to sign URL:", err);
      }
    }
  }

  return path;
}
