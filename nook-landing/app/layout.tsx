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
