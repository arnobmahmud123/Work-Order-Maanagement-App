"use client";

import { useSession } from "next-auth/react";
import { AIChat } from "@/components/ai-chat";
import { Card } from "@/components/ui";
import { Sparkles } from "lucide-react";

function AIAccessGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  if (role === "CONTRACTOR") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Sparkles className="h-16 w-16 text-text-dim mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h2>
          <p className="text-text-muted">Contractors do not have access to AI features.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AIChatPage() {
  return (
    <AIAccessGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            <Sparkles className="inline h-6 w-6 mr-2 text-cyan-400" />
            AI Assistant
          </h1>
          <p className="text-text-muted mt-1">
            Ask anything about your work orders, properties, contractors, or business
            performance. The AI has full context of your data.
          </p>
        </div>

        <Card padding={false} className="h-[calc(100vh-12rem)]">
          <AIChat
            embedded
            context={{ type: "general" }}
            className="h-full"
          />
        </Card>
      </div>
    </AIAccessGuard>
  );
}
