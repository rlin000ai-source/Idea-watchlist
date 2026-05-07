import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Watchlist",
  description: "Equity watchlist with thesis grading",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
