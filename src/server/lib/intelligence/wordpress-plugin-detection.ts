const WORDPRESS_PLUGIN_NAME_BY_SLUG: Record<string, string> = {
  woocommerce: "WooCommerce",
  elementor: "Elementor",
  "elementor-pro": "Elementor Pro",
  "wordpress-seo": "Yoast SEO",
  "contact-form-7": "Contact Form 7",
  jetpack: "Jetpack",
  js_composer: "WPBakery Page Builder",
  gravityforms: "Gravity Forms",
  "advanced-custom-fields": "Advanced Custom Fields",
  revslider: "Slider Revolution",
  wordfence: "Wordfence Security",
  "all-in-one-seo-pack": "All in One SEO",
  "wp-rocket": "WP Rocket",
  "google-analytics-for-wordpress": "MonsterInsights",
  "seo-by-rank-math": "Rank Math SEO",
  "wp-super-cache": "WP Super Cache",
  "wp-smushit": "Smush",
  updraftplus: "UpdraftPlus",
  wpforms: "WPForms",
  "easy-digital-downloads": "Easy Digital Downloads",
  memberpress: "MemberPress",
  "sfwd-lms": "LearnDash",
  "litespeed-cache": "LiteSpeed Cache",
  akismet: "Akismet",
  "ninja-forms": "Ninja Forms",
  "mailchimp-for-wp": "Mailchimp for WordPress",
  "sitepress-multilingual-cms": "WPML",
  redirection: "Redirection",
  "duplicate-post": "Yoast Duplicate Post",
  "really-simple-ssl": "Really Simple SSL",
  "cookie-law-info": "CookieYes",
};

const WORDPRESS_REST_NAMESPACE_MAP: Record<string, string> = {
  wc: "WooCommerce",
  woocommerce: "WooCommerce",
  yoast: "Yoast SEO",
  rankmath: "Rank Math SEO",
  aioseo: "All in One SEO",
  elementor: "Elementor",
  jetpack: "Jetpack",
  wordfence: "Wordfence Security",
  wpforms: "WPForms",
  gravityforms: "Gravity Forms",
  acf: "Advanced Custom Fields",
  revslider: "Slider Revolution",
  learndash: "LearnDash",
  memberpress: "MemberPress",
};

const RESERVED_NAMESPACES = new Set(["wp", "oembed"]);
const IGNORED_PLUGIN_SLUGS = new Set([
  "plugins",
  "mu-plugins",
  "themes",
  "uploads",
  "cache",
]);

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFriendlyPluginName(slug: string): string {
  const normalizedSlug = slug.trim().toLowerCase();
  const mapped = WORDPRESS_PLUGIN_NAME_BY_SLUG[normalizedSlug];
  if (mapped) return mapped;

  return normalizedSlug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((token) => {
      if (token.length <= 3) return token.toUpperCase();
      return `${token.charAt(0).toUpperCase()}${token.slice(1)}`;
    })
    .join(" ");
}

function isLikelyPluginSlug(value: string): boolean {
  const slug = value.trim().toLowerCase();
  if (!slug || slug.length > 64) return false;
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) return false;
  if (IGNORED_PLUGIN_SLUGS.has(slug)) return false;
  return true;
}

export function extractPluginNamesFromHtml(html: string): string[] {
  const slugs = new Set<string>();
  const slugPatterns = [
    /wp-content\/plugins\/([a-z0-9_-]+)/gi,
    /wp-content\\\/plugins\\\/([a-z0-9_-]+)/gi,
  ];

  for (const pattern of slugPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const slug = (match[1] || "").toLowerCase();
      if (isLikelyPluginSlug(slug)) {
        slugs.add(slug);
      }
    }
  }

  return Array.from(slugs).map(toFriendlyPluginName);
}

function collectNamespacesFromWpJsonPayload(payload: unknown): Set<string> {
  const namespaces = new Set<string>();
  if (!isObjectRecord(payload)) return namespaces;

  if (Array.isArray(payload.namespaces)) {
    for (const namespace of payload.namespaces) {
      if (typeof namespace !== "string") continue;
      const root = namespace.split("/")[0]?.toLowerCase() || "";
      if (root) namespaces.add(root);
    }
  }

  if (isObjectRecord(payload.routes)) {
    for (const route of Object.keys(payload.routes)) {
      const routeMatch = route.match(/^\/([a-z0-9-]+)\//i);
      if (routeMatch?.[1]) {
        namespaces.add(routeMatch[1].toLowerCase());
      }
    }
  }

  return namespaces;
}

export function extractPluginNamesFromWpJsonPayload(
  payload: unknown,
): string[] {
  const namespaces = collectNamespacesFromWpJsonPayload(payload);
  const pluginNames = new Set<string>();

  for (const namespace of namespaces) {
    if (RESERVED_NAMESPACES.has(namespace)) continue;

    const mapped = WORDPRESS_REST_NAMESPACE_MAP[namespace];
    if (mapped) {
      pluginNames.add(mapped);
      continue;
    }

    if (isLikelyPluginSlug(namespace)) {
      pluginNames.add(toFriendlyPluginName(namespace));
    }
  }

  return Array.from(pluginNames);
}
