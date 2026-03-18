import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Nook - Clean your Mac",
  description:
    "A lightweight disk utility for macOS. See what's taking up space and clean it — duplicates, dev junk, old files — in seconds.",
  openGraph: {
    title: "Nook - Clean your Mac",
    description:
      "A lightweight disk utility for macOS. See what's taking up space and clean it — duplicates, dev junk, old files — in seconds.",
    siteName: "Nook",
    images: [
      {
        url: "https://usenook.vercel.app/Nook-og.png",
        width: 1200,
        height: 630,
        alt: "Nook - Clean your Mac",
      },
    ],
    type: "website",
    url: "https://usenook.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nook - Clean your Mac",
    description:
      "A lightweight disk utility for macOS. See what's taking up space and clean it — duplicates, dev junk, old files — in seconds.",
    images: ["https://usenook.vercel.app/Nook-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased bg-n-bg text-n-text font-inter`}
      >
        {children}
      </body>
    </html>
  );
}
