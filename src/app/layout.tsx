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
