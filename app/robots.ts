import type { MetadataRoute } from "next";
import { person } from "@/content/person";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${person.url}/sitemap.xml`,
  };
}
