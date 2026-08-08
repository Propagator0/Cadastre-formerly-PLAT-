import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PLAT — codebase atlas",
  description:
    "PLAT maps a codebase to an isometric cityscape: files are cubes stacked piece-by-piece, languages are districts, and a section toggle pulls the city apart to reveal what is wired to what.",
  keywords: [
    "PLAT",
    "codebase visualization",
    "isometric city",
    "software cartography",
    "architecture map",
    "Next.js",
    "TypeScript",
  ],
  authors: [{ name: "PLAT" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "PLAT — codebase atlas",
    description:
      "A codebase mapped to a city. Files are cubes, languages are districts. Pull the city apart to see what is wired to what.",
    url: "https://chat.z.ai",
    siteName: "PLAT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PLAT — codebase atlas",
    description:
      "A codebase mapped to a city. Files are cubes, languages are districts.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
