import type { Metadata } from "next"
import { Fraunces, IBM_Plex_Sans_Condensed } from "next/font/google"
import { AppShell } from "@/components/app-shell"
import "./globals.css"

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
})

const plexSansCondensed = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap"
})

export const metadata: Metadata = {
  title: "CampaignOS",
  description: "Open-source operating infrastructure for democratic campaigns."
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${plexSansCondensed.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
