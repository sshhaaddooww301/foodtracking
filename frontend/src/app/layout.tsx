import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TrustChain Supply — Supply Chain Integrity Platform",
  description: "Prevent counterfeit medicines and adulterated food products with blockchain-backed supply chain verification.",
  keywords: "supply chain, blockchain, counterfeit detection, pharmaceutical, food safety",
  openGraph: {
    title: "TrustChain Supply",
    description: "Supply Chain Integrity & Counterfeit Detection Platform",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-inter">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
