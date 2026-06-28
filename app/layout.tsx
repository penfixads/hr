import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Penfix Employee Skills Assessment",
  description: "Penfix Advertising and Business Solutions — Employee Skills Assessment and Onboarding Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
