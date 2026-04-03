import type { Request, Response } from "express";
import https from "https";
import http from "http";
import { assertPublicDomain } from "../../../lib/ssrf-protection.js";

export default async function handler(req: Request, res: Response) {
  try {
    const domain = req.query.domain as string;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    // Clean domain
    const cleanDomain = domain
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .split("/")[0];

    // SSRF protection: ensure domain doesn't resolve to internal IP
    try {
      await assertPublicDomain(cleanDomain);
    } catch {
      return res.status(400).json({
        reachable: false,
        error: "Domain resolves to a private/internal IP address",
      });
    }

    // Check both HTTP and HTTPS
    const results = await Promise.allSettled([
      checkUrl(`https://${cleanDomain}`),
      checkUrl(`https://www.${cleanDomain}`),
      checkUrl(`http://${cleanDomain}`),
      checkUrl(`http://www.${cleanDomain}`),
    ]);

    // Find first successful connection
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.reachable) {
        return res.json(result.value);
      }
    }

    // All attempts failed - check if it's a parked domain
    const lastError =
      results[0].status === "rejected" ? results[0].reason : "Unknown error";
    const isParked = await checkIfParked(cleanDomain);

    return res.json({
      reachable: false,
      isParked,
      error: lastError,
      message: isParked
        ? "This domain appears to be parked or not configured"
        : "Unable to connect to this website",
    });
  } catch (error) {
    console.error("Reachability check error:", error);
    res.status(500).json({
      error: "Failed to check site reachability",
      reachable: false,
    });
  }
}

function checkUrl(
  url: string,
): Promise<{
  reachable: boolean;
  statusCode?: number;
  url: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const protocol = url.startsWith("https") ? https : http;
    const timeout = 10000; // 10 second timeout

    const options = {
      timeout,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
      },
    };

    const req = protocol.get(url, options, (response) => {
      const statusCode = response.statusCode || 0;

      // Consider 2xx, 3xx, and even some 4xx as reachable (site exists but may require auth/specific headers)
      // 403 Forbidden = site exists but blocking us
      // 401 Unauthorized = site exists but requires auth
      // 405 Method Not Allowed = site exists but doesn't like GET
      if (statusCode >= 200 && statusCode < 400) {
        resolve({ reachable: true, statusCode, url });
      } else if (
        statusCode === 403 ||
        statusCode === 401 ||
        statusCode === 405
      ) {
        // Site exists but is blocking/restricting access - still consider reachable
        resolve({ reachable: true, statusCode, url });
      } else if (statusCode >= 400) {
        resolve({
          reachable: false,
          statusCode,
          url,
          error: `HTTP ${statusCode}`,
        });
      } else {
        resolve({ reachable: false, url, error: "Invalid response" });
      }

      // Abort the request to free resources
      response.destroy();
    });

    req.on("error", (error: NodeJS.ErrnoException) => {
      let errorMessage = "Connection failed";

      if (error.code === "ENOTFOUND") {
        errorMessage = "Domain not found (DNS resolution failed)";
      } else if (error.code === "ECONNREFUSED") {
        errorMessage = "Connection refused";
      } else if (error.code === "ETIMEDOUT") {
        errorMessage = "Connection timeout";
      } else if (error.code === "ECONNRESET") {
        errorMessage = "Connection reset";
      } else if (error.message) {
        errorMessage = error.message;
      }

      resolve({ reachable: false, url, error: errorMessage });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ reachable: false, url, error: "Connection timeout" });
    });

    req.end();
  });
}

async function checkIfParked(domain: string): Promise<boolean> {
  try {
    // Try to get the page content to check for parking indicators
    const url = `https://${domain}`;

    return new Promise((resolve) => {
      const req = https.get(url, { timeout: 5000 }, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
          // Only collect first 10KB to check for parking indicators
          if (data.length > 10000) {
            response.destroy();
          }
        });

        response.on("end", () => {
          const lowerData = data.toLowerCase();

          // Common parking page indicators
          const parkingIndicators = [
            "domain is parked",
            "this domain is for sale",
            "buy this domain",
            "domain parking",
            "parked domain",
            "coming soon",
            "under construction",
            "hostinginfo.gg/domains",
            "namecheap parking",
            "sedo parking",
          ];

          const isParked = parkingIndicators.some((indicator) =>
            lowerData.includes(indicator),
          );

          resolve(isParked);
        });
      });

      req.on("error", () => {
        resolve(false);
      });

      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  } catch {
    return false;
  }
}
