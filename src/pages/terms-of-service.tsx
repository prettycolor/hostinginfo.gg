/**
 * Terms of Service Page
 * Comprehensive legal terms for HostingInfo
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Shield,
  Users,
  AlertCircle,
  Calculator,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { PAGE_META } from "@/lib/seo-meta";

interface TermsSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  highlight?: boolean;
}

function TermsSection({
  id,
  title,
  icon,
  children,
  highlight,
}: TermsSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      id={id}
      className={`mb-6 border rounded-lg overflow-hidden ${
        highlight ? "border-blue-500 bg-blue-500/5" : "border-border bg-card"
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`${highlight ? "text-blue-500" : "text-primary"}`}>
            {icon}
          </div>
          <h2 className="text-xl font-semibold text-left">{title}</h2>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>

      {isOpen && (
        <div className="px-6 py-4 border-t border-border">
          <div className="prose prose-invert max-w-none">{children}</div>
        </div>
      )}
    </div>
  );
}

export default function TermsOfService() {
  const lastUpdated = "February 24, 2026";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={PAGE_META.terms.title}
        description={PAGE_META.terms.description}
        keywords={PAGE_META.terms.keywords}
        noindex={PAGE_META.terms.noindex}
      />
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-white" />
            <h1 className="text-4xl font-bold text-white mb-4">
              Terms of Service
            </h1>
            <p className="text-xl text-white/90 mb-2">
              HostingInfo - Free Domain & Website Analysis Tool
            </p>
            <p className="text-sm text-white/70">Last Updated: {lastUpdated}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Important Notice */}
          <div className="mb-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-blue-500 mb-2">
                  Important Information
                </h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>
                    • HostingInfo is a <strong>completely free tool</strong> for
                    everyone
                  </li>
                  <li>
                    • Creating an account is <strong>optional</strong>
                  </li>
                  <li>
                    • We will <strong>never charge</strong> for this service
                  </li>
                  <li>• No premium or paid features planned</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Table of Contents */}
          <div className="mb-8 p-6 bg-card border border-border rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Table of Contents</h3>
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <a href="#introduction" className="text-primary hover:underline">
                • 1. Introduction & Acceptance
              </a>
              <a
                href="#service-description"
                className="text-primary hover:underline"
              >
                • 2. Service Description
              </a>
              <a
                href="#ddc-disclaimer"
                className="text-primary hover:underline"
              >
                • 3. Domain Discount Calculator
              </a>
              <a href="#user-accounts" className="text-primary hover:underline">
                • 4. User Accounts (Optional)
              </a>
              <a
                href="#acceptable-use"
                className="text-primary hover:underline"
              >
                • 5. Acceptable Use Policy
              </a>
              <a href="#data-privacy" className="text-primary hover:underline">
                • 6. Data Collection & Privacy
              </a>
              <a
                href="#intellectual-property"
                className="text-primary hover:underline"
              >
                • 7. Intellectual Property
              </a>
              <a href="#disclaimers" className="text-primary hover:underline">
                • 8. Disclaimers & Limitations
              </a>
              <a href="#third-party" className="text-primary hover:underline">
                • 9. Third-Party Services
              </a>
              <a href="#termination" className="text-primary hover:underline">
                • 10. Termination
              </a>
              <a href="#changes" className="text-primary hover:underline">
                • 11. Changes to Terms
              </a>
              <a href="#governing-law" className="text-primary hover:underline">
                • 12. Governing Law
              </a>
              <a href="#contact" className="text-primary hover:underline">
                • 13. Contact Information
              </a>
            </div>
          </div>

          {/* Terms Sections */}
          <TermsSection
            id="introduction"
            title="1. Introduction & Acceptance"
            icon={<FileText className="w-6 h-6" />}
          >
            <p>
              Welcome to HostingInfo. By accessing or using our website and
              services, you agree to be bound by these Terms of Service
              ("Terms"). If you do not agree to these Terms, please do not use
              our services.
            </p>
            <p>
              HostingInfo is a free online tool that provides domain and website
              analysis, including security scanning, technology stack detection,
              SEO checklists, and performance monitoring.
            </p>
            <p>
              <strong>Age Requirement:</strong> You must be at least 13 years
              old to use HostingInfo. If you are under 18, you must have
              permission from a parent or guardian.
            </p>
          </TermsSection>

          <TermsSection
            id="service-description"
            title="2. Service Description"
            icon={<Shield className="w-6 h-6" />}
          >
            <p>
              HostingInfo provides the following services, completely free of
              charge:
            </p>
            <ul>
              <li>
                <strong>Domain & Website Scanning:</strong> Analyze domains and
                websites for various metrics
              </li>
              <li>
                <strong>Security Analysis:</strong> Check SSL certificates,
                security headers, and potential vulnerabilities
              </li>
              <li>
                <strong>Technology Stack Detection:</strong> Identify
                technologies, frameworks, and platforms used
              </li>
              <li>
                <strong>SEO Checklist:</strong> Evaluate SEO best practices and
                provide recommendations
              </li>
              <li>
                <strong>Performance Monitoring:</strong> Track website
                performance metrics over time
              </li>
              <li>
                <strong>DNS Analysis:</strong> View DNS records and
                configuration
              </li>
              <li>
                <strong>Email Configuration:</strong> Check email security (SPF,
                DKIM, DMARC)
              </li>
            </ul>
            <p>
              <strong>Free Forever:</strong> All features are and will remain
              free. We do not plan to introduce premium or paid tiers.
            </p>
            <p>
              <strong>Optional Accounts:</strong> Creating an account is
              optional. Anonymous users can scan domains without registration.
              Accounts provide additional features like scan history, favorites,
              and performance tracking.
            </p>
          </TermsSection>

          <TermsSection
            id="ddc-disclaimer"
            title="3. Domain Discount Calculator - Special Notice"
            icon={<Calculator className="w-6 h-6" />}
            highlight={true}
          >
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="font-semibold text-yellow-500 mb-2">
                ⚠️ Important Disclaimer
              </p>
              <p className="text-sm">
                The Domain Discount Calculator (DDC) is a separate tool with
                distinct functionality:
              </p>
            </div>
            <ul>
              <li>
                <strong>No Digital Fingerprint Scanning:</strong> The DDC does
                NOT perform any domain scanning, security analysis, or
                technology detection
              </li>
              <li>
                <strong>Pricing Comparison Only:</strong> The DDC is solely for
                comparing domain registration and renewal pricing across
                different registrars
              </li>
              <li>
                <strong>No Data Collection:</strong> The DDC does not collect,
                store, or analyze any domain data beyond pricing information
              </li>
              <li>
                <strong>Third-Party Data:</strong> Pricing data is sourced from
                publicly available registrar pricing information
              </li>
              <li>
                <strong>No Guarantees:</strong> Prices shown are estimates and
                may not reflect current registrar pricing. Always verify prices
                directly with registrars
              </li>
            </ul>
            <p>
              The DDC is a standalone calculator tool and operates independently
              from the main HostingInfo scanning services.
            </p>
          </TermsSection>

          <TermsSection
            id="user-accounts"
            title="4. User Accounts (Optional)"
            icon={<Users className="w-6 h-6" />}
          >
            <p>
              <strong>Account Creation is Optional:</strong> You can use
              HostingInfo without creating an account. Anonymous users have
              access to all scanning features.
            </p>
            <p>
              <strong>Benefits of Creating an Account:</strong>
            </p>
            <ul>
              <li>Save scan history for future reference</li>
              <li>Add domains to favorites for quick access</li>
              <li>Track performance metrics over time</li>
              <li>Receive email notifications for scan results</li>
              <li>Access advanced filtering and comparison tools</li>
            </ul>
            <p>
              <strong>Account Security:</strong> You are responsible for
              maintaining the confidentiality of your account credentials.
              Notify us immediately if you suspect unauthorized access.
            </p>
            <p>
              <strong>Account Termination:</strong> You may delete your account
              at any time from your account settings. We reserve the right to
              terminate accounts that violate these Terms.
            </p>
          </TermsSection>

          <TermsSection
            id="acceptable-use"
            title="5. Acceptable Use Policy"
            icon={<Shield className="w-6 h-6" />}
          >
            <p>
              <strong>Permitted Uses:</strong>
            </p>
            <ul>
              <li>Scanning domains you own or have permission to scan</li>
              <li>Analyzing publicly available website information</li>
              <li>
                Using scan results for legitimate business or personal purposes
              </li>
              <li>Sharing scan results (with attribution)</li>
            </ul>
            <p>
              <strong>Prohibited Uses:</strong>
            </p>
            <ul>
              <li>Automated scraping or mass scanning without permission</li>
              <li>Attempting to bypass rate limits or security measures</li>
              <li>Using the service for illegal activities</li>
              <li>Scanning domains without authorization</li>
              <li>Attempting to exploit vulnerabilities in our service</li>
              <li>Reselling or redistributing our services</li>
              <li>Impersonating other users or entities</li>
            </ul>
            <p>
              <strong>Rate Limiting:</strong> We implement rate limiting to
              ensure fair usage. Excessive scanning may result in temporary
              restrictions.
            </p>
          </TermsSection>

          <TermsSection
            id="data-privacy"
            title="6. Data Collection & Privacy"
            icon={<Shield className="w-6 h-6" />}
          >
            <p>
              <strong>What Data We Collect:</strong>
            </p>
            <ul>
              <li>
                <strong>Scan Data:</strong> Domain names, scan results,
                timestamps
              </li>
              <li>
                <strong>Account Data (Optional):</strong> Email, name,
                preferences (only if you create an account)
              </li>
              <li>
                <strong>Usage Data:</strong> IP addresses, browser information,
                usage patterns
              </li>
              <li>
                <strong>Cookies:</strong> Essential cookies for functionality,
                analytics cookies (Google Analytics)
              </li>
            </ul>
            <p>
              <strong>How We Use Data:</strong>
            </p>
            <ul>
              <li>Provide and improve our services</li>
              <li>Maintain scan history for registered users</li>
              <li>Send email notifications (if enabled)</li>
              <li>Analyze usage patterns to improve the service</li>
              <li>Prevent abuse and ensure security</li>
            </ul>
            <p>
              <strong>Data Retention:</strong>
            </p>
            <ul>
              <li>Anonymous scans: Retained for 90 days</li>
              <li>Registered user scans: Retained until account deletion</li>
              <li>Account data: Deleted upon account termination</li>
            </ul>
            <p>
              <strong>Data Sharing:</strong> We do NOT sell your data. We may
              share data with:
            </p>
            <ul>
              <li>Third-party service providers (e.g., hosting, analytics)</li>
              <li>Law enforcement (if legally required)</li>
            </ul>
            <p>
              <strong>Your Rights:</strong> You have the right to access,
              correct, or delete your personal data. Contact us to exercise
              these rights.
            </p>
          </TermsSection>

          <TermsSection
            id="intellectual-property"
            title="7. Intellectual Property"
            icon={<FileText className="w-6 h-6" />}
          >
            <p>
              <strong>Our Intellectual Property:</strong> HostingInfo, including
              its design, code, and content, is protected by copyright and other
              intellectual property laws. You may not copy, modify, or
              distribute our service without permission.
            </p>
            <p>
              <strong>User-Generated Content:</strong> You retain ownership of
              any content you submit (e.g., notes, tags). By submitting content,
              you grant us a license to use it to provide our services.
            </p>
            <p>
              <strong>Third-Party Content:</strong> Scan results may include
              information from third-party sources. We do not claim ownership of
              this information.
            </p>
            <p>
              <strong>Trademarks:</strong> HostingInfo and our logo are
              trademarks. You may not use them without permission.
            </p>
          </TermsSection>

          <TermsSection
            id="disclaimers"
            title="8. Disclaimers & Limitations of Liability"
            icon={<AlertCircle className="w-6 h-6" />}
          >
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="font-semibold text-red-500 mb-2">
                ⚠️ Important Legal Disclaimer
              </p>
              <p className="text-sm">
                Please read this section carefully. It limits our liability.
              </p>
            </div>
            <p>
              <strong>"As-Is" Service:</strong> HostingInfo is provided "as is"
              without warranties of any kind, express or implied. We do not
              guarantee:
            </p>
            <ul>
              <li>Accuracy or completeness of scan results</li>
              <li>Uninterrupted or error-free service</li>
              <li>Security or privacy of data</li>
              <li>Fitness for a particular purpose</li>
            </ul>
            <p>
              <strong>Not Professional Advice:</strong> Scan results are for
              informational purposes only and do not constitute:
            </p>
            <ul>
              <li>Legal advice</li>
              <li>Security advice</li>
              <li>Professional consulting</li>
              <li>Recommendations to take specific actions</li>
            </ul>
            <p>
              <strong>No Liability for Decisions:</strong> We are not
              responsible for any decisions you make based on scan results.
              Always consult with qualified professionals for important
              decisions.
            </p>
            <p>
              <strong>Limitation of Liability:</strong> To the maximum extent
              permitted by law, we are not liable for:
            </p>
            <ul>
              <li>Indirect, incidental, or consequential damages</li>
              <li>Loss of profits, data, or business opportunities</li>
              <li>
                Damages resulting from use or inability to use the service
              </li>
              <li>Damages from third-party services or content</li>
            </ul>
            <p>
              <strong>Maximum Liability:</strong> Our total liability shall not
              exceed $100 USD or the amount you paid us (which is $0, since the
              service is free).
            </p>
          </TermsSection>

          <TermsSection
            id="third-party"
            title="9. Third-Party Services"
            icon={<Shield className="w-6 h-6" />}
          >
            <p>HostingInfo uses various third-party services and APIs:</p>
            <ul>
              <li>
                <strong>Google PageSpeed Insights:</strong> Performance analysis
              </li>
              <li>
                <strong>Google Safe Browsing:</strong> Security scanning
              </li>
              <li>
                <strong>WhoisFreaks:</strong> WHOIS data
              </li>
              <li>
                <strong>IPInfo:</strong> IP geolocation
              </li>
              <li>
                <strong>URLScan:</strong> Website scanning
              </li>
              <li>
                <strong>VirusTotal:</strong> Malware detection
              </li>
            </ul>
            <p>
              <strong>Third-Party Links:</strong> Our service may contain links
              to third-party websites. We are not responsible for their content
              or practices.
            </p>
            <p>
              <strong>No Endorsement:</strong> Inclusion of third-party services
              does not imply endorsement.
            </p>
          </TermsSection>

          <TermsSection
            id="termination"
            title="10. Termination"
            icon={<AlertCircle className="w-6 h-6" />}
          >
            <p>
              <strong>Your Right to Terminate:</strong> You may stop using
              HostingInfo at any time. If you have an account, you may delete it
              from your account settings.
            </p>
            <p>
              <strong>Our Right to Terminate:</strong> We reserve the right to
              suspend or terminate your access to HostingInfo if:
            </p>
            <ul>
              <li>You violate these Terms</li>
              <li>You engage in abusive or illegal behavior</li>
              <li>We are required to do so by law</li>
              <li>We discontinue the service (with notice)</li>
            </ul>
            <p>
              <strong>Effect of Termination:</strong> Upon termination, your
              right to use HostingInfo ceases immediately. We may delete your
              account data after termination.
            </p>
          </TermsSection>

          <TermsSection
            id="changes"
            title="11. Changes to Terms"
            icon={<FileText className="w-6 h-6" />}
          >
            <p>
              We may update these Terms from time to time. Changes will be
              effective when posted on this page.
            </p>
            <p>
              <strong>Notification of Changes:</strong>
            </p>
            <ul>
              <li>
                Material changes will be announced via email (for registered
                users)
              </li>
              <li>The "Last Updated" date will be updated</li>
              <li>Continued use after changes constitutes acceptance</li>
            </ul>
            <p>
              <strong>Your Options:</strong> If you do not agree to changes, you
              may stop using HostingInfo.
            </p>
          </TermsSection>

          <TermsSection
            id="governing-law"
            title="12. Governing Law & Dispute Resolution"
            icon={<Shield className="w-6 h-6" />}
          >
            <p>
              <strong>Governing Law:</strong> These Terms are governed by the
              laws of [Your Jurisdiction], without regard to conflict of law
              principles.
            </p>
            <p>
              <strong>Dispute Resolution:</strong> Any disputes arising from
              these Terms or your use of HostingInfo shall be resolved through:
            </p>
            <ol>
              <li>
                <strong>Informal Resolution:</strong> Contact us first to
                resolve the issue informally
              </li>
              <li>
                <strong>Mediation:</strong> If informal resolution fails, we
                agree to mediation
              </li>
              <li>
                <strong>Arbitration:</strong> Binding arbitration as a last
                resort
              </li>
            </ol>
            <p>
              <strong>Class Action Waiver:</strong> You agree to resolve
              disputes individually, not as part of a class action.
            </p>
          </TermsSection>

          <TermsSection
            id="contact"
            title="13. Contact Information"
            icon={<Users className="w-6 h-6" />}
          >
            <p>
              If you have questions about these Terms or HostingInfo, please
              contact us:
            </p>
            <div className="bg-card border border-border rounded-lg p-4 mt-4">
              <p>
                <strong>Email:</strong> support@hostinginfo.gg
              </p>
              <p>
                <strong>Website:</strong> https://hostinginfo.gg
              </p>
              <p>
                <strong>Response Time:</strong> We aim to respond within 48
                hours
              </p>
            </div>
          </TermsSection>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p className="mb-2">
              By using HostingInfo, you acknowledge that you have read,
              understood, and agree to be bound by these Terms of Service.
            </p>
            <p>
              <strong>Version 1.0</strong> | Last Updated: {lastUpdated}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
