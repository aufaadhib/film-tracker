import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return [
    { url: siteUrl.toString(), changeFrequency: "weekly", priority: 1 },
    { url: new URL("/extension", siteUrl).toString(), changeFrequency: "monthly", priority: 0.6 },
  ];
}
