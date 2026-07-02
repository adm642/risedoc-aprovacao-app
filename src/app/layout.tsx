import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Axiforma — fonte de títulos/destaques da marca Risedoc
const axiforma = localFont({
  src: [
    { path: "../fonts/Axiforma-Light.ttf", weight: "300", style: "normal" },
    { path: "../fonts/Axiforma-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Axiforma-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/Axiforma-Heavy.ttf", weight: "700", style: "normal" },
    { path: "../fonts/Axiforma-Black.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-axiforma",
  display: "swap",
});

// Sora — fonte de corpo
const sora = localFont({
  src: "../fonts/Sora-Variable.ttf",
  weight: "100 800",
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Risedoc · Aprovação de Posts",
    template: "%s · Risedoc",
  },
  description:
    "Plataforma de aprovação de conteúdo da Risedoc — revise e aprove os posts da sua clínica em poucos minutos.",
};

export const viewport: Viewport = {
  // permite usar env(safe-area-inset-*) no iPhone (barra do navegador / home indicator)
  viewportFit: "cover",
  themeColor: "#009E8E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${axiforma.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
