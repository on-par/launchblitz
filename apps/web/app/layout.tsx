import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "LaunchBlitz",
  description: "Build a business in one session.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
