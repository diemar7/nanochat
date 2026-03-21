'use client'

import { Geist } from "next/font/google";
import "./globals.css";
import { useEffect } from "react";

const geist = Geist({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if ('virtualKeyboard' in navigator) {
      // @ts-ignore
      navigator.virtualKeyboard.overlaysContent = true
    }
  }, [])

  return (
    <html lang="es" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>NanoChat</title>
        <meta name="description" content="El chat de la familia" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a7a4a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NanoChat" />
      </head>
      <body className={`${geist.className} h-full`}>{children}</body>
    </html>
  );
}
