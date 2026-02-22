import type { Metadata } from "next";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minimalist Gym Progression Engine",
  description: "Foundation app for logging gym sessions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="relative overflow-x-hidden">
        <ToastProvider>
          <AnimatedBackground />
          <main className="relative z-10 mx-auto min-h-screen w-full max-w-md px-4 py-6">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
