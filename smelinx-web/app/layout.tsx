import "./globals.css";

export const metadata = {
  title: "Smelinx — API Lifecycle Management",
  description: "Register APIs, track versions, and automate deprecation notices.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-900 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
