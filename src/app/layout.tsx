import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
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
  title: "Prowider Lead Distribution",
  description: "Mini lead generation and distribution system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-white">
      <body
        className={`${geistSans.variable} ${geistMono.variable} app-shell flex min-h-screen flex-col bg-white antialiased`}
      >
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
          {children}
        </main>
        <footer className="mt-auto border-t border-slate-200/80 bg-white py-6 pb-10 text-center text-xs text-slate-500">
          Prowider Mini Lead Distribution · Assignment demo
        </footer>
      </body>
    </html>
  );
}
