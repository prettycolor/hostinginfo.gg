export interface WebsiteBuilderDetectionResult {
  isWebsiteBuilder: boolean;
  builderType: string | null;
  matchedSignals: string[];
}

interface WebsiteBuilderSignature {
  name: string;
  htmlStrong: string[];
  htmlMedium?: string[];
  htmlWeak?: string[];
  domain?: string[];
  server?: string[];
}

const STRONG_MATCH_SCORE = 4;
const MEDIUM_MATCH_SCORE = 2;
const WEAK_MATCH_SCORE = 1;
const DOMAIN_MATCH_SCORE = 5;
const SERVER_MATCH_SCORE = 3;

const WEBSITE_BUILDER_SIGNATURES: WebsiteBuilderSignature[] = [
  {
    name: "Wix",
    htmlStrong: [
      'meta name="generator" content="wix',
      "static.wixstatic.com",
      "wixsite.com",
    ],
    htmlMedium: ["wix-code", "_wix", "data-wix-"],
    domain: [".wixsite.com"],
  },
  {
    name: "Squarespace",
    htmlStrong: [
      'meta name="generator" content="squarespace',
      "static.squarespace.com",
      "sqsp.net",
      "squarespace-cdn.com",
    ],
    htmlMedium: ["squarespace-cdn"],
    domain: [".squarespace.com"],
  },
  {
    name: "Shopify",
    htmlStrong: [
      "cdn.shopify.com",
      "shopify.com/s/files",
      'meta name="shopify-checkout-api-token"',
      "shopify-digital-wallet",
    ],
    htmlMedium: ["shopify.theme", "shopify-section", "shopify-app"],
    domain: [".myshopify.com"],
  },
  {
    name: "Webflow",
    htmlStrong: [
      'meta name="generator" content="webflow',
      "assets.website-files.com",
      "data-wf-page",
      "data-wf-site",
      "data-wf-domain",
    ],
    htmlMedium: ["webflow.js"],
    domain: [".webflow.io"],
  },
  {
    name: "Weebly",
    htmlStrong: [
      'meta name="generator" content="weebly',
      "editmysite.com",
      "cdn2.editmysite.com",
      "weeblycloud.com",
      "www.weebly.com",
    ],
    htmlMedium: ["weebly-site-id", '_w.configdomain = "www.weebly.com"'],
    domain: [".weebly.com"],
  },
  {
    name: "Framer",
    htmlStrong: [
      'meta name="generator" content="framer',
      "built with framer",
      "framerusercontent.com",
    ],
    htmlMedium: ["data-framer-", "__framer-badge-container"],
    domain: [".framer.website", ".framer.app"],
    server: ["framer/"],
  },
  {
    name: "HubSpot CMS",
    htmlStrong: ["hs_cos_wrapper", "hub_generated", "/hubfs/"],
    htmlMedium: ["js.hs-scripts.com", "js.hs-analytics.net", "hs-sites"],
    domain: [".hs-sites.com", ".hs-sites-eu1.com", ".hs-sites-na1.com"],
  },
  {
    name: "Webnode",
    htmlStrong: [
      'meta name="generator" content="webnode',
      "rs_cfg['systemname'] = 'webnode'",
      "/wysiwyg/system.style.css",
      "duyn491kcolsw.cloudfront.net",
    ],
    htmlMedium: ["webnode.page"],
    domain: [".webnode.page"],
    server: ["webnode"],
  },
  {
    name: "WordPress.com",
    htmlStrong: ['meta name="generator" content="wordpress.com', "s0.wp.com"],
    htmlMedium: ["wpcom"],
    domain: [".wordpress.com"],
  },
  {
    name: "Duda",
    htmlStrong: [
      "dmcdn.net",
      "cdn-website.com",
      'meta name="generator" content="duda',
    ],
    htmlMedium: ["data-duda", "dudaone.com"],
    domain: [".dudaone.com"],
  },
  {
    name: "Site123",
    htmlStrong: [
      'meta name="generator" content="site123',
      "cdn-cms-s.f-static.com",
      "site123.me",
    ],
    htmlMedium: ["site123"],
    domain: [".site123.me"],
  },
  {
    name: "Jimdo",
    htmlStrong: [
      'meta name="generator" content="jimdo',
      "assets.jimstatic.com",
      "jimdosite.com",
    ],
    htmlMedium: ["jimdo.com"],
    domain: [".jimdosite.com"],
  },
  {
    name: "Strikingly",
    htmlStrong: [
      'meta name="generator" content="strikingly',
      "static-assets.strikinglycdn.com",
    ],
    htmlMedium: ["strikingly.com"],
    domain: [".strikingly.com"],
  },
  {
    name: "Carrd",
    htmlStrong: [
      'meta name="generator" content="carrd',
      "assets.carrd.co",
      "carrd.co/assets",
    ],
    htmlMedium: ["carrd.co"],
    domain: [".carrd.co"],
  },
  {
    name: "Elementor Cloud",
    htmlStrong: ["elementor.cloud"],
    domain: [".elementor.cloud"],
  },
  {
    name: "BigCommerce",
    htmlStrong: ["cdn.bcapp", "mybigcommerce.com", "stencil-utils"],
    htmlMedium: ["bigcommerce.com"],
    domain: [".mybigcommerce.com"],
  },
  {
    name: "GoDaddy Website Builder",
    htmlStrong: [
      'meta name="generator" content="starfield technologies',
      "godaddy website builder",
      "godaddy website builder",
      "img1.wsimg.com",
      "img.wsimg.com",
      "wsimg.com",
    ],
    htmlMedium: ["dps-static.com"],
    htmlWeak: ["wsb-"],
    domain: [".godaddysites.com", ".godaddysites.com"],
    server: ["dps/"],
  },
];

export function detectWebsiteBuilderType(
  html: string,
  domain: string,
  serverHeader?: string | null,
): WebsiteBuilderDetectionResult {
  const htmlLower = html.toLowerCase();
  const domainLower = domain.toLowerCase();
  const serverLower = (serverHeader || "").toLowerCase();

  let bestMatch: {
    name: string | null;
    score: number;
    strongSignals: number;
    matchedSignals: string[];
  } = {
    name: null,
    score: 0,
    strongSignals: 0,
    matchedSignals: [],
  };

  for (const signature of WEBSITE_BUILDER_SIGNATURES) {
    let score = 0;
    let strongSignals = 0;
    const matchedSignals: string[] = [];

    for (const pattern of signature.htmlStrong) {
      if (htmlLower.includes(pattern)) {
        score += STRONG_MATCH_SCORE;
        strongSignals += 1;
        matchedSignals.push(`html:${pattern}`);
      }
    }

    for (const pattern of signature.htmlMedium || []) {
      if (htmlLower.includes(pattern)) {
        score += MEDIUM_MATCH_SCORE;
        matchedSignals.push(`html:${pattern}`);
      }
    }

    for (const pattern of signature.htmlWeak || []) {
      if (htmlLower.includes(pattern)) {
        score += WEAK_MATCH_SCORE;
        matchedSignals.push(`html:${pattern}`);
      }
    }

    for (const pattern of signature.domain || []) {
      if (domainLower.includes(pattern)) {
        score += DOMAIN_MATCH_SCORE;
        strongSignals += 1;
        matchedSignals.push(`domain:${pattern}`);
      }
    }

    for (const pattern of signature.server || []) {
      if (serverLower.includes(pattern)) {
        score += SERVER_MATCH_SCORE;
        strongSignals += 1;
        matchedSignals.push(`server:${pattern}`);
      }
    }

    if (
      score > bestMatch.score ||
      (score === bestMatch.score && strongSignals > bestMatch.strongSignals)
    ) {
      bestMatch = {
        name: signature.name,
        score,
        strongSignals,
        matchedSignals,
      };
    }
  }

  const hasReliableMatch =
    bestMatch.name !== null &&
    bestMatch.strongSignals > 0 &&
    bestMatch.score >= STRONG_MATCH_SCORE;

  if (!hasReliableMatch) {
    return {
      isWebsiteBuilder: false,
      builderType: null,
      matchedSignals: [],
    };
  }

  return {
    isWebsiteBuilder: true,
    builderType: bestMatch.name,
    matchedSignals: bestMatch.matchedSignals,
  };
}
