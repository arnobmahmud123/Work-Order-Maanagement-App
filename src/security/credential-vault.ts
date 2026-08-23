import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const DEFAULT_SALT = "ppw-connector-vault-salt-2026";

function getMasterKey(): Buffer {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "d3f7495b219e4a8b98163f92a0e5c1d847a9e6b3c2d1e0f4a8b7c6d5e4f3a2b1";
  return crypto.scryptSync(secret, DEFAULT_SALT, 32);
}

/**
 * Encrypt a plain text string or JSON object using AES-256-GCM
 */
export function encryptSecret(plainTextOrObj: string | Record<string, any>): string {
  const text = typeof plainTextOrObj === "string" ? plainTextOrObj : JSON.stringify(plainTextOrObj);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM ciphertext string
 */
export function decryptSecret<T = any>(cipherText: string): T {
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) {
      // Fallback if plaintext or malformed
      try {
        return JSON.parse(cipherText);
      } catch {
        return cipherText as any;
      }
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
    
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted as any;
    }
  } catch (error) {
    console.error("[CredentialVault] Decryption failed:", error);
    throw new Error("Failed to decrypt credentials. Key mismatch or corrupted data.");
  }
}

/**
 * Redact sensitive credential keys from arbitrary objects or strings before logging or storing
 */
const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "api_key",
  "secret",
  "clientsecret",
  "client_secret",
  "authorization",
  "cookie",
  "session",
  "auth",
  "privatekey",
  "private_key",
]);

export function sanitizePayload(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(sanitizePayload);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, "");
    if (SENSITIVE_KEYS.has(lowerKey) || SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "********";
    } else if (typeof val === "object") {
      sanitized[key] = sanitizePayload(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Mask string for UI display (e.g., "ak_live_12345678" -> "ak_l...5678")
 */
export function maskSecretString(secret?: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "********";
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}
