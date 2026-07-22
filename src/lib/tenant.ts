import { auth } from "./auth";
import { redirect } from "next/navigation";

/**
 * Returns the companyId of the authenticated user or redirects them to the login page.
 * Safe to use in Next.js Server Components and Server Actions.
 */
export async function getTenantIdOrRedirect(): Promise<string> {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;
  if (!companyId) {
    redirect("/auth/signin");
  }
  return companyId;
}

/**
 * Returns the companyId of the authenticated user or throws an unauthorized error.
 * Safe to use inside Next.js Route Handlers (APIs).
 */
export async function getTenantIdOrThrow(): Promise<string> {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;
  
  // Super admin does not have a companyId, but can bypass filters
  const role = (session?.user as any)?.role;
  if (role === "SUPER_ADMIN") {
    return ""; // Return empty to indicate super admin bypass
  }

  if (!companyId) {
    throw new Error("Unauthorized: No tenant company ID in session");
  }
  return companyId;
}

/**
 * Safely fetches the active user context (userId, role, companyId) from the session.
 */
export async function getTenantContext() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return {
    userId: (session.user as any).id as string,
    role: (session.user as any).role as string,
    companyId: (session.user as any).companyId as string | null,
  };
}
