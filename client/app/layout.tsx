import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import RootProvider from "./provider";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import { Analytics } from "@vercel/analytics/next";
const inter = Inter({ subsets: ["latin"] });

const APP_NAME = "Jasper";
const APP_TITLE = "Jasper · Calibration Suite";
const APP_DESCRIPTION = "Jasper — calibration reporting and traceability. Works offline in the field.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: { default: APP_TITLE, template: `%s — ${APP_NAME}` },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <ServiceWorkerRegister />
        <RootProvider>{children}</RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
