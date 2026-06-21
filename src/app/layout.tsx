import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Product Requests",
  description: "Submit and track product requests, features, and enhancements.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
