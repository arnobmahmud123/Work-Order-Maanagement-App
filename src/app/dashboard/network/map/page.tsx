"use client";

import { useSession } from "next-auth/react";
import { MapPin } from "lucide-react";
import ContractorMapPage from "./map-client";

export const dynamic = "force-dynamic";

export default function Page() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  if (role === "CONTRACTOR") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <MapPin className="h-16 w-16 text-text-dim mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h2>
          <p className="text-text-muted">Contractors do not have access to the contractor map.</p>
        </div>
      </div>
    );
  }

  return <ContractorMapPage />;
}
