import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voteometer",
  description: "Compare candidate preference and electability",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}