import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = 'https://greenlight-ptsd.vercel.app';

export const metadata: Metadata = {
  title: 'Greenlight — Vantage Arm Control Suite',
  description:
    'Browser-based 7-DOF robotic arm simulator with inverse kinematics, safety gating, voice control, autonomous PIN entry, and agentic AI. Built by Team PTSD.',
  keywords: [
    'robotic arm', 'simulator', 'inverse kinematics', 'IK', 'CCD',
    'safety gate', 'voice control', 'autonomous PIN', 'agentic AI',
    'URDF', 'Three.js', 'Next.js', 'Zustand', 'Zod', 'Gemini',
  ],
  authors: [{ name: 'Team PTSD' }],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: 'Greenlight — Vantage Arm Control Suite',
    description:
      'Browser-based 7-DOF robotic arm simulator. 6 input methods, 1 shared pipeline, 0 ungated paths.',
    siteName: 'Greenlight',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Greenlight — Robotic Arm Control Suite' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Greenlight — Vantage Arm Control Suite',
    description:
      'Browser-based 7-DOF robotic arm simulator. IK, safety gate, voice, autonomous PIN, agentic AI.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
