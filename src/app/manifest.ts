import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "수업진도 체크표",
    short_name: "수업진도표",
    description: "교사용 수업 진도 체크 웹앱",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe3",
    theme_color: "#2f6c4f",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
