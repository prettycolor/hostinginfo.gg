import { Helmet } from "@dr.pogodin/react-helmet";
import { generateStructuredData } from "@/lib/seo-meta";

/**
 * SEO Head Component
 *
 * Comprehensive SEO meta tags for national organic ranking.
 * Includes Open Graph, Twitter Cards, and Schema.org structured data.
 */

export interface SEOHeadProps {
  title: string;
  description: string;
  keywords: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}

export function SEOHead({
  title,
  description,
  keywords,
  canonical,
  ogImage = "/images/g-dollar-emoji.png",
  noindex = false,
}: SEOHeadProps) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const canonicalUrl = canonical || url;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="HostingInfo" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />

      {/* Additional Meta Tags */}
      <meta name="author" content="HostingInfo" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="distribution" content="global" />
      <meta name="rating" content="general" />

      {/* Mobile Optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#000000" />

      {/* Schema.org Structured Data */}
      <script type="application/ld+json">{generateStructuredData()}</script>
    </Helmet>
  );
}
