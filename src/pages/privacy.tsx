import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";

export default function PrivacyPolicy() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={PAGE_META.privacy.title}
        description={PAGE_META.privacy.description}
        keywords={PAGE_META.privacy.keywords}
        noindex={PAGE_META.privacy.noindex}
      />

      <main className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
        <header className="border-b border-border pb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            HostingInfo
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last Updated: March 20, 2026
          </p>
          <p className="mt-6 max-w-4xl text-base leading-7 text-muted-foreground">
            HostingInfo is a free, public domain analysis tool. We are committed
            to protecting your privacy and being transparent about how we
            collect, use, and protect your information.
          </p>
        </header>

        <section className="mt-8 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold text-foreground">
            Privacy at a Glance
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
            <li>
              <strong>Free Service:</strong> HostingInfo is completely free with
              no monetization.
            </li>
            <li>
              <strong>Optional Accounts:</strong> You can use basic features
              without creating an account.
            </li>
            <li>
              <strong>No Selling:</strong> We do not sell your personal
              information to third parties.
            </li>
            <li>
              <strong>Essential + Optional:</strong> We use essential
              cookies/browser storage for core functionality and optional
              analytics tools when you consent.
            </li>
            <li>
              <strong>Your Control:</strong> You can request deletion of your
              account and data at any time.
            </li>
          </ul>
        </section>

        <article className="mt-10 space-y-8">
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">
              1. Information We Collect
            </h2>

            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Account Information (Optional)
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  When you create an account, we collect:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    <strong>Email Address:</strong> Used for account creation,
                    login, and email verification.
                  </li>
                  <li>
                    <strong>Password:</strong> Stored as a secure hash (bcrypt);
                    we never store plain text passwords.
                  </li>
                  <li>
                    <strong>Full Name:</strong> Optional and only stored if you
                    provide it.
                  </li>
                  <li>
                    <strong>Account Timestamps:</strong> Creation date, last
                    login, and email verification date.
                  </li>
                </ul>
                <div className="mt-3 rounded-md border-l-2 border-border bg-muted/40 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> You can use HostingInfo without an
                    account for basic domain scans. Accounts are required only
                    for saved scan history and advanced features.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Domain Scan Data
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  When you scan a domain, we collect:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    <strong>Domain Names:</strong> The domains you scan.
                  </li>
                  <li>
                    <strong>Scan Results:</strong> Technical data about scanned
                    domains (DNS, SSL, security headers, hosting provider, and
                    related signals).
                  </li>
                  <li>
                    <strong>Scan History:</strong> Timestamps and scan types
                    performed (for logged-in users).
                  </li>
                  <li>
                    <strong>Performance Metrics:</strong> Historical performance
                    data for scanned domains.
                  </li>
                </ul>
                <div className="mt-3 rounded-md border-l-2 border-border bg-muted/40 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Important:</strong> Scan data is primarily technical
                    website information, not personal information about you.
                    Anonymous scans are not linked to a personal profile.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Session and Authentication Data
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  When you log in, we store:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    <strong>JWT Tokens:</strong> Secure authentication tokens
                    with server-defined expiration (currently about 24 hours for
                    standard sign-in).
                  </li>
                  <li>
                    <strong>Session Information:</strong> Login timestamps and
                    last activity time.
                  </li>
                  <li>
                    <strong>IP Address:</strong> Used for security and fraud
                    prevention.
                  </li>
                  <li>
                    <strong>User Agent:</strong> Browser and device information
                    used for security monitoring.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Analytics and Usage Data
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We use analytics to improve service reliability and product
                  quality, including:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    <strong>Page Views:</strong> Which pages are visited.
                  </li>
                  <li>
                    <strong>Feature Usage:</strong> Which features are used
                    most.
                  </li>
                  <li>
                    <strong>Performance Metrics:</strong> Load times and error
                    signals.
                  </li>
                  <li>
                    <strong>Referral Source:</strong> How visitors arrive at
                    HostingInfo.
                  </li>
                  <li>
                    <strong>Device Information:</strong> Browser type, screen
                    size, and operating system.
                  </li>
                </ul>
                <div className="mt-3 rounded-md border-l-2 border-border bg-muted/40 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Your Choice:</strong> You can decline analytics
                    cookies through our cookie banner without losing core site
                    functionality.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">
              2. How We Use Your Information
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  To Provide the Service
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Perform domain scans and analysis.</li>
                  <li>Store your scan history if you have an account.</li>
                  <li>Generate and export reports.</li>
                  <li>Send account and verification emails.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  To Improve the Service
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    Analyze usage patterns to identify bugs and improve
                    features.
                  </li>
                  <li>Understand which features deliver the most value.</li>
                  <li>Improve performance and overall user experience.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  For Security and Compliance
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Prevent fraud and abuse.</li>
                  <li>Detect and mitigate security threats.</li>
                  <li>Monitor suspicious activity.</li>
                  <li>Comply with legal obligations.</li>
                </ul>
              </div>

              <div className="rounded-md border-l-2 border-destructive/40 bg-destructive/10 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  What We Do Not Do
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>We do not sell personal information.</li>
                  <li>We do not share data with advertisers.</li>
                  <li>
                    We do not send marketing emails beyond essential
                    service-related communication.
                  </li>
                  <li>We do not monetize user data.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">
              3. Cookies and Tracking
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Essential Cookies (Always Active)
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  These cookies are required for core functionality:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    <strong>Authentication:</strong> Session cookies may be used
                    during OAuth sign-in and short-lived auth handoff flows.
                  </li>
                  <li>
                    <strong>Security:</strong> Cookie and session settings (for
                    example, httpOnly and sameSite) help protect sign-in flows.
                  </li>
                  <li>
                    <strong>Preferences:</strong> Consent and related settings
                    required for normal operation are stored in browser storage.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Analytics Cookies (Optional)
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  These cookies help us understand usage:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    <strong>C2 Analytics:</strong> HostingInfo analytics for
                    product improvement.
                  </li>
                  <li>
                    <strong>Google Analytics:</strong> Used when configured and
                    consent is granted.
                  </li>
                  <li>
                    <strong>Feature Usage:</strong> Patterns showing which tools
                    are used most often.
                  </li>
                </ul>
                <div className="mt-3 rounded-md border-l-2 border-border bg-muted/40 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Your Control:</strong> You can accept or decline
                    analytics cookies using the banner. Your preference is
                    stored in browser storage for 180 days.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Managing Cookies
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Use the cookie banner when prompted.</li>
                  <li>
                    Manage cookie and browser-storage behavior in browser
                    settings.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">
              4. Data Storage and Security
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  How We Protect Data
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    <strong>Encryption:</strong> Data in transit uses HTTPS (TLS
                    1.2+).
                  </li>
                  <li>
                    <strong>Password Security:</strong> Passwords are hashed
                    using bcrypt.
                  </li>
                  <li>
                    <strong>JWT Security:</strong> Signed tokens with expiration
                    controls.
                  </li>
                  <li>
                    <strong>Database Controls:</strong> Restricted database
                    access.
                  </li>
                  <li>
                    <strong>Session Management:</strong> Session and token
                    lifetimes are enforced with expiration controls and managed
                    cleanup processes.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Data Retention
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    <strong>Account Data:</strong> Retained until account
                    deletion.
                  </li>
                  <li>
                    <strong>Scan History:</strong> Retained for logged-in users
                    unless deleted.
                  </li>
                  <li>
                    <strong>Anonymous Scans:</strong> Not linked to user
                    identity; retained for analytics and service quality.
                  </li>
                  <li>
                    <strong>Sessions:</strong> Set with expiration times and
                    retained according to operational cleanup practices.
                  </li>
                  <li>
                    <strong>Verification Tokens:</strong> Expire for
                    verification checks and are marked as used after successful
                    verification.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Data Location
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Data is stored on secured infrastructure using
                  industry-standard safeguards.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">
              5. Your Rights and Choices
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Access Your Data
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  You can review account information and scan history in your
                  account dashboard.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Delete Your Data
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  You may request deletion of account data and scan history
                  through account settings or by contacting us.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    <strong>Delete Account:</strong> Account deletion removes
                    account records and associated stored data.
                  </li>
                  <li>
                    <strong>Delete Scan History:</strong> Remove selected scans
                    or all saved history.
                  </li>
                  <li>
                    <strong>Cookie Controls:</strong> Decline analytics cookies
                    or clear browser storage.
                  </li>
                </ul>
                {user && (
                  <p className="mt-3 text-sm">
                    <Link
                      to="/account-settings"
                      className="font-medium text-primary hover:underline"
                    >
                      Manage your data in Account Settings
                    </Link>
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Export Your Data
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  You can export scan results as PDF reports when available.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Opt Out of Analytics
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Declining analytics cookies does not affect core service
                  access.
                </p>
              </div>

              <div className="rounded-md border-l-2 border-border bg-muted/40 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  <strong>Contact:</strong> To exercise privacy rights, use the
                  contact details in Section 9.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">
              6. Third-Party Services
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Analytics Services
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We use consent-gated analytics services, including C2
                  analytics and (when configured) Google Analytics, to
                  understand product usage and improve reliability and UX. You
                  may opt out through cookie controls.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  External APIs
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We query third-party technical services to gather domain data:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    <strong>DNS/Network Services:</strong> DNS resolution and
                    nameserver intelligence.
                  </li>
                  <li>
                    <strong>SSL/TLS Services:</strong> Certificate and transport
                    security checks.
                  </li>
                  <li>
                    <strong>WHOIS/RDAP Services:</strong> Domain registration
                    and lifecycle data.
                  </li>
                  <li>
                    <strong>Performance Services:</strong> Website performance
                    analysis (for example, PageSpeed APIs).
                  </li>
                  <li>
                    <strong>Threat/Reputation Services:</strong> Security and
                    malware reputation checks when configured.
                  </li>
                  <li>
                    <strong>Infrastructure/Technology Services:</strong> IP,
                    ASN/geolocation, and technology-detection enrichment when
                    configured.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">
              7. Children&apos;s Privacy
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              HostingInfo is not intended for children under 13 years of age. We
              do not knowingly collect personal information from children under
              13. If you believe a child has provided personal information,
              contact us and we will take appropriate deletion steps.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">
              8. Changes to This Policy
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              We may update this policy periodically. If updates are material,
              we will take appropriate notice actions, which may include
              updating this page date, posting a website notice, and contacting
              account holders where appropriate.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Continued use of HostingInfo after publication of updates
              constitutes acceptance of the revised policy.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-2xl font-semibold text-foreground">
              9. Contact Us
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              For questions about this Privacy Policy or data handling
              practices, contact:
            </p>
            <div className="mt-3 rounded-md border border-border bg-muted/40 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                HostingInfo Privacy Team
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Email:{" "}
                <a
                  href="mailto:privacy@hostinginfo.gg"
                  className="font-medium text-primary hover:underline"
                >
                  privacy@hostinginfo.gg
                </a>
              </p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              We aim to respond within 30 days.
            </p>
          </section>
        </article>

        <footer className="mt-8 rounded-lg border border-border bg-muted/30 p-5">
          <p className="text-sm text-muted-foreground">
            <strong>Transparency Commitment:</strong> HostingInfo is a free,
            non-commercial tool. We do not sell personal information, serve ads
            based on personal profiles, or monetize user data.
          </p>
        </footer>
      </main>
    </div>
  );
}
