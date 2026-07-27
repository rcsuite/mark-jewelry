import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ContactProvider } from "@/components/chat/ContactProvider";
import PublicChatMount from "@/components/chat/PublicChatMount";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Earthen Miners Designs",
  description:
    "One-artisan forged silver and stone jewelry. Follow the live build, then shop The Vault.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "EMD Admin",
    statusBarStyle: "black-translucent",
  },
  applicationName: "Earthen Miners Designs",
};

export const viewport: Viewport = {
  themeColor: "#05070A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ContactProvider>
          {children}
          <PublicChatMount />
        </ContactProvider>
      </body>
    </html>
  );
}
