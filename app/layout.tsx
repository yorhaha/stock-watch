import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ResourceHints } from "@/components/ResourceHints";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteOrigin = "https://yorhaha.github.io";
const siteUrl = `${siteOrigin}${basePath || "/stock-watch"}/`;
const ogImageUrl = `${siteOrigin}${basePath}/og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Tape · A 股 / ETF 日内盯盘",
  description:
    "两列标的，一眼看清。为 A 股与 ETF 日内盯盘设计的极简自选行情页：高密度走势、实时价格、指数自定义与批量导入。",
  applicationName: "Tape",
  keywords: ["A股", "ETF", "盯盘", "自选股", "分时图", "股票行情", "Tape"],
  authors: [{ name: "yorhaha", url: "https://github.com/yorhaha" }],
  creator: "yorhaha",
  alternates: { canonical: siteUrl },
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${basePath}/favicon.svg`, type: "image/svg+xml" },
      { url: `${basePath}/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    shortcut: `${basePath}/favicon.svg`,
    apple: `${basePath}/apple-touch-icon.png`,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    siteName: "Tape",
    title: "Tape · A 股 / ETF 日内盯盘",
    description: "两列标的，一眼看清。克制、安静、足够快的 A 股与 ETF 自选行情。",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Tape — 两列标的，一眼看清。",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tape · A 股 / ETF 日内盯盘",
    description: "两列标的，一眼看清。",
    images: [ogImageUrl],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0d" },
  ],
  colorScheme: "light dark",
};

const themeScript = `
(function () {
  try {
    var raw = localStorage.getItem("tape.preferences.v1");
    var prefs = raw ? JSON.parse(raw) : {};
    var mode = prefs.theme === "light" || prefs.theme === "dark" ? prefs.theme : "auto";
    var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = mode === "auto" ? (dark ? "dark" : "light") : mode;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.showPrice = prefs.showPrice === false ? "false" : "true";
    document.documentElement.dataset.showIndexValue = prefs.showIndexValue === false ? "false" : "true";
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    var fallback = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = fallback;
    document.documentElement.dataset.showPrice = "true";
    document.documentElement.dataset.showIndexValue = "true";
    document.documentElement.style.colorScheme = fallback;
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ResourceHints />
        {children}
      </body>
    </html>
  );
}
