import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/payment/"],
      },
    ],
    sitemap: "https://nookapp.site/sitemap.xml",
  };
}
