import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NanoChat",
  description: "El chat de la familia",
  manifest: "/manifest.json",
  themeColor: "#1a7a4a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NanoChat",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className={`${geist.className} h-full`}>{children}</body>
    </html>
  );
}
