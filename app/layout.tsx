import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Same families as the public ultrashaheens.com site.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Ultra Shaheens",
  description: "Workspace for the Ultra Shaheens team",
  manifest: "/manifest.json",
  icons: {
    icon: "/ultra-shaheens-logo.png",
    apple: "/ultra-shaheens-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ultra Shaheens",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${barlow.variable} ${barlowCondensed.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
