import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ice-Breaker!",
  description: "Foster community and lower networking barriers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
