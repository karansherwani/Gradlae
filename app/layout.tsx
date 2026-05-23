import type { Metadata } from "next";
import "./globals.css";
import Provider from "./components/Provider";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
