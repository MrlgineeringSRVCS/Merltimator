import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Merltimator — Construction Cost Estimator",
  description: "Plan smarter. Estimate accurately. Build confidently. Construction cost estimates and BOQ for Philippine building projects.",
}

export const viewport: Viewport = { themeColor: "#0f2342", width: "device-width", initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
