import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Byggeplads-AI",
  description: "Overblik over bemanding på tværs af dine byggepladser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className="font-body min-h-screen">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </body>
    </html>
  );
}
