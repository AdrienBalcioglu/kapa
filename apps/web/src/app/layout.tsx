import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "App Builder - Transform your website into a mobile app",
  description: "Build iOS and Android apps from your website in minutes. No code required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}>
          <header className="bg-white border-b border-gray-200">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                <Link href="/" className="text-xl font-bold text-blue-600">
                  AppBuilder
                </Link>
                <div className="flex items-center gap-6">
                  <SignedIn>
                    <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                      Dashboard
                    </Link>
                    <Link
                      href="/create"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create App
                    </Link>
                    <UserButton afterSignOutUrl="/" />
                  </SignedIn>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Se connecter
                      </button>
                    </SignInButton>
                  </SignedOut>
                </div>
              </div>
            </nav>
          </header>
          <main className="min-h-screen">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 py-8 mt-16">
            <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
              App Builder SaaS - Transform your website into a mobile app
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
