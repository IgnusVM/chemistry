import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chemistry · Alchemy Asset Management",
    short_name: "Chemistry",
    description: "Asset management and work orders for Alchemy departments.",
    // Installed app opens straight to the mobile-first home, not the desktop dashboard.
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#c026d3",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scan a QR tag", short_name: "Scan", url: "/scan" },
      { name: "New work order", short_name: "New WO", url: "/work-orders/new" },
      { name: "My work orders", short_name: "My WOs", url: "/work-orders?mine=1" },
    ],
  };
}
