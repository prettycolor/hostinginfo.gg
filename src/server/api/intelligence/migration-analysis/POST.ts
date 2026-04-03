/**
 * Migration Analysis API Endpoint
 *
 * Analyzes a domain's technology stack and provides:
 * - Custom code detection
 * - cPanel compatibility
 * - HostingInfo hosting recommendation
 * - Migration difficulty and timeline
 */

import type { Request, Response } from "express";
import {
  analyzeMigration,
  type TechStack,
} from "../../../../lib/engines/migration-analysis-engine.js";
import { detectTechnologies } from "../../../../lib/engines/tech-detection-engine.js";

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    );
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return [value];
  }

  return [];
}

function normalizeTechStack(input: unknown): TechStack {
  const source =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  // Shape from homepage analyzer (technologyData object).
  const serverObj =
    source.server && typeof source.server === "object"
      ? (source.server as Record<string, unknown>)
      : null;
  const wordpressObj =
    source.wordpress && typeof source.wordpress === "object"
      ? (source.wordpress as Record<string, unknown>)
      : null;
  const phpObj =
    source.php && typeof source.php === "object"
      ? (source.php as Record<string, unknown>)
      : null;

  // Shape from tech-detection-engine (categories + technologies arrays).
  const categoriesObj =
    source.categories && typeof source.categories === "object"
      ? (source.categories as Record<string, unknown>)
      : null;
  const technologiesArray = Array.isArray(source.technologies)
    ? (source.technologies as Array<Record<string, unknown>>)
    : [];

  const frameworks = [...toStringArray(source.frameworks)];
  const server = [...toStringArray(source.server)];
  const buildTools = [...toStringArray(source.buildTools)];
  const devOps = [...toStringArray(source.devOps)];
  const apis = [...toStringArray(source.apis)];
  const databases = [...toStringArray(source.databases)];
  const languages = [...toStringArray(source.languages)];
  const frontend = [...toStringArray(source.frontend)];
  const backend = [...toStringArray(source.backend)];

  let cms = typeof source.cms === "string" ? source.cms : undefined;

  if (serverObj) {
    const serverType = typeof serverObj.type === "string" ? serverObj.type : "";
    if (serverType) {
      server.push(serverType);
    }
  }

  if (wordpressObj) {
    const wordpressDetected = wordpressObj.detected === true;
    if (wordpressDetected && !cms) {
      cms = "WordPress";
    }
  }

  if (phpObj) {
    const phpDetected = phpObj.detected === true;
    if (phpDetected) {
      languages.push("PHP");
    }
  }

  if (categoriesObj) {
    const categoryAsNames = (key: string): string[] => {
      const entry = categoriesObj[key];
      if (!Array.isArray(entry)) return [];
      return entry
        .map((item) =>
          item && typeof item === "object"
            ? (item as Record<string, unknown>).name
            : null,
        )
        .filter(
          (name): name is string =>
            typeof name === "string" && name.trim().length > 0,
        );
    };

    frameworks.push(...categoryAsNames("JS Framework"));
    frontend.push(...categoryAsNames("CSS Framework"));
    backend.push(...categoryAsNames("Web Server"));
    server.push(...categoryAsNames("Web Server"));
    languages.push(...categoryAsNames("Language"));

    if (!cms) {
      const cmsCandidates = categoryAsNames("CMS");
      if (cmsCandidates.length > 0) {
        cms = cmsCandidates[0];
      }
    }
  }

  if (technologiesArray.length > 0) {
    for (const tech of technologiesArray) {
      const name = typeof tech.name === "string" ? tech.name : "";
      const category =
        typeof tech.category === "string" ? tech.category.toLowerCase() : "";
      if (!name) continue;

      if (category.includes("framework")) frameworks.push(name);
      if (category.includes("server")) server.push(name);
      if (category.includes("language")) languages.push(name);
      if (category.includes("database")) databases.push(name);
      if (category.includes("api")) apis.push(name);
      if (!cms && category.includes("cms")) cms = name;
    }
  }

  const dedupe = (items: string[]) =>
    Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

  return {
    frameworks: dedupe(frameworks),
    server: dedupe(server),
    buildTools: dedupe(buildTools),
    cms,
    devOps: dedupe(devOps),
    apis: dedupe(apis),
    databases: dedupe(databases),
    languages: dedupe(languages),
    frontend: dedupe(frontend),
    backend: dedupe(backend),
  };
}

export default async function handler(req: Request, res: Response) {
  try {
    const { domain, techStack } = req.body;

    if (!domain && !techStack) {
      return res.status(400).json({
        error: "Missing required field",
        message: "Either domain or techStack is required",
      });
    }

    let stack = techStack;

    // If only domain provided, detect tech stack first
    if (!techStack && domain) {
      try {
        stack = await detectTechnologies(domain);
      } catch {
        return res.status(500).json({
          error: "Technology detection failed",
          message: "An internal error occurred",
        });
      }
    }

    const normalizedStack = normalizeTechStack(stack);

    // Perform migration analysis
    const analysis = await analyzeMigration(normalizedStack);

    res.json({
      success: true,
      domain: domain || "unknown",
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Migration analysis error:", error);
    res.status(500).json({
      error: "Migration analysis failed",
      message: "An internal error occurred",
    });
  }
}
