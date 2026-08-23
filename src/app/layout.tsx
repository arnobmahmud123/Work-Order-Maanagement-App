import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { ElevenLabsChat } from "@/components/elevenlabs-chat";
import "./globals.css";

export const metadata: Metadata = {
  title: "PropPreserve - Property Preservation Management",
  description: "B2B platform for property preservation work orders, field documentation, and team coordination.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            if (typeof window !== "undefined" && !window.location.host.includes("workers.dev") && !window.location.host.includes("localhost:3000")) {
              const originalFetch = window.fetch;
              window.fetch = function(input, init) {
                if (typeof input === "string" && input.startsWith("/api/")) {
                  const apiBase = "https://work-order-maanagement-app.arnobmahmud123.workers.dev";
                  return originalFetch(apiBase + input, init);
                }
                return originalFetch(input, init);
              };
            }
          })();
        `}} />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <ElevenLabsChat />
        </Providers>
      </body>
    </html>
  );
}
