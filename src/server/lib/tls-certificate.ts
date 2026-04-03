import tls from "node:tls";
import { X509Certificate } from "node:crypto";

type PeerCertificate = ReturnType<tls.TLSSocket["getPeerCertificate"]>;
type PeerCertificateWithMetadata = PeerCertificate & {
  valid_from?: string;
  valid_to?: string;
  raw?: Buffer;
};

function parseCertificateDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export async function fetchPeerCertificate(
  domain: string,
  timeoutMs = 10_000,
): Promise<{ cert: PeerCertificate; protocol: string }> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: domain,
      port: 443,
      servername: domain,
      rejectUnauthorized: false,
    });

    let settled = false;
    const settle = <T>(fn: () => T): T | void => {
      if (settled) return;
      settled = true;
      cleanup();
      return fn();
    };

    const cleanup = () => {
      socket.removeAllListeners("secureConnect");
      socket.removeAllListeners("error");
      socket.removeAllListeners("timeout");
    };

    socket.setTimeout(timeoutMs);

    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      if (!cert || Object.keys(cert).length === 0) {
        settle(() => reject(new Error("No SSL certificate found")));
        socket.destroy();
        return;
      }

      const protocol = socket.getProtocol() || "Unknown";
      settle(() => resolve({ cert, protocol }));
      socket.end();
    });

    socket.once("timeout", () => {
      settle(() => reject(new Error("Connection timeout")));
      socket.destroy();
    });

    socket.once("error", (error) => {
      settle(() => reject(error));
      socket.destroy();
    });
  });
}

export function getCertificateValidity(cert: PeerCertificate): {
  validFrom: Date | null;
  validTo: Date | null;
} {
  const normalizedCert = cert as PeerCertificateWithMetadata;
  let validFrom = parseCertificateDate(normalizedCert.valid_from);
  let validTo = parseCertificateDate(normalizedCert.valid_to);

  // Fallback to X509 parsing when Node omits/parses date strings inconsistently.
  if ((!validFrom || !validTo) && normalizedCert.raw) {
    try {
      const x509 = new X509Certificate(normalizedCert.raw);
      if (!validFrom) validFrom = parseCertificateDate(x509.validFrom);
      if (!validTo) validTo = parseCertificateDate(x509.validTo);
    } catch {
      // Ignore fallback parse errors and keep best-effort values.
    }
  }

  return { validFrom, validTo };
}
