import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Provider from "./components/Provider";

// Self-hosted via next/font — no render-blocking external stylesheet
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Gradlae – Personalized University Academic Pacing",
  description: "Upload transcripts, match batch placements, take qualification quizzes, and unlock tailored university course pacing on the Gradlae academic success platform.",
  openGraph: {
    title: "Gradlae – Personalized University Academic Pacing",
    description: "Discover your optimal learning speed. Match accelerate, standard, and supported tracks tailored directly to your transcript details.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gradlae – Personalized University Academic Pacing",
    description: "Discover your optimal learning speed. Match accelerate, standard, and supported tracks tailored directly to your transcript details.",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
