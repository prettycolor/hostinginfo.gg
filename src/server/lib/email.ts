import nodemailer from "nodemailer";

/**
 * Email configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Add these to your .env file:
 *    EMAIL_HOST=smtp.gmail.com (or your SMTP server)
 *    EMAIL_PORT=587
 *    EMAIL_USER=your-email@gmail.com
 *    EMAIL_PASSWORD=your-app-password
 *    EMAIL_FROM=noreply@yourdomain.com
 *    APP_URL=https://yourdomain.com (or http://localhost:20000 for dev)
 *
 * 2. For Gmail:
 *    - Enable 2FA on your Google account
 *    - Generate an App Password: https://myaccount.google.com/apppasswords
 *    - Use the App Password as EMAIL_PASSWORD
 *
 * 3. For production:
 *    - Use a dedicated email service (SendGrid, AWS SES, Mailgun)
 *    - All have free tiers (SendGrid: 100/day, AWS SES: 62k/month)
 */

const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASSWORD || "",
  },
};

const FROM_EMAIL =
  process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@hostinginfo.gg";
const APP_URL = process.env.APP_URL || "http://localhost:20000";

/**
 * Create email transporter
 */
function createTransporter() {
  if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
    console.warn(
      "⚠️  Email not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env",
    );
    return null;
  }
  return nodemailer.createTransport(EMAIL_CONFIG);
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  fullName?: string,
): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    console.error("❌ Cannot send email: Email not configured");
    return false;
  }

  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
  const firstName = fullName?.split(" ")[0] || "there";

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Verify your email - HostingInfo",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center;">
                      <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">Verify Your Email</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 0 40px 40px;">
                      <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                        Hi ${firstName},
                      </p>
                      <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                        Thanks for signing up for HostingInfo! To complete your registration and unlock all features, please verify your email address.
                      </p>
                      <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                        Click the button below to verify your email:
                      </p>
                      
                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 0 0 30px;">
                            <a href="${verificationUrl}" style="display: inline-block; padding: 14px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Verify Email Address</a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 20px; color: #6a6a6a; font-size: 14px; line-height: 1.6;">
                        Or copy and paste this link into your browser:
                      </p>
                      <p style="margin: 0 0 30px; color: #0066cc; font-size: 14px; word-break: break-all;">
                        ${verificationUrl}
                      </p>
                      
                      <p style="margin: 0 0 10px; color: #6a6a6a; font-size: 14px; line-height: 1.6;">
                        This link will expire in 24 hours.
                      </p>
                      <p style="margin: 0; color: #6a6a6a; font-size: 14px; line-height: 1.6;">
                        If you didn't create an account, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; border-top: 1px solid #e5e5e5; text-align: center;">
                      <p style="margin: 0; color: #8a8a8a; font-size: 12px; line-height: 1.6;">
                        © ${new Date().getFullYear()} HostingInfo. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Hi ${firstName},

Thanks for signing up for HostingInfo! To complete your registration and unlock all features, please verify your email address.

Verify your email by clicking this link:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

© ${new Date().getFullYear()} HostingInfo. All rights reserved.
      `,
    });

    console.log(`Verification email sent successfully`);
    return true;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return false;
  }
}

/**
 * Send welcome email (after verification)
 */
export async function sendWelcomeEmail(
  email: string,
  fullName?: string,
): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) return false;

  const firstName = fullName?.split(" ")[0] || "there";

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to HostingInfo! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to HostingInfo</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px;">
                      <h1 style="margin: 0 0 20px; color: #1a1a1a; font-size: 28px; font-weight: 600;">Welcome to HostingInfo! 🎉</h1>
                      <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                        Hi ${firstName},
                      </p>
                      <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                        Your email has been verified! You now have full access to all HostingInfo features.
                      </p>
                      <h2 style="margin: 30px 0 15px; color: #1a1a1a; font-size: 20px; font-weight: 600;">What you can do now:</h2>
                      <ul style="margin: 0 0 20px; padding-left: 20px; color: #4a4a4a; font-size: 16px; line-height: 1.8;">
                        <li>Save unlimited scan history</li>
                        <li>Track performance trends over time</li>
                        <li>Claim and verify your domains</li>
                        <li>Export detailed PDF reports</li>
                        <li>Access advanced analytics</li>
                      </ul>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${APP_URL}" style="display: inline-block; padding: 14px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Start Scanning</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log(`Welcome email sent successfully`);
    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  fullName?: string,
  options?: { adminIssued?: boolean },
): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    console.error("Cannot send password reset email: Email not configured");
    return false;
  }

  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const firstName = fullName?.split(" ")[0] || "there";
  const introLine = options?.adminIssued
    ? "An administrator requested a password reset for your account."
    : "You requested a password reset for your account.";

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset your password - HostingInfo",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px;">
                      <h1 style="margin: 0 0 20px; color: #1a1a1a; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
                      <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
                      <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">${introLine}</p>
                      <p style="margin: 0 0 30px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">Click the button below to choose a new password:</p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 0 0 30px;">
                            <a href="${resetUrl}" style="display: inline-block; padding: 14px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">Reset Password</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 0 0 10px; color: #6a6a6a; font-size: 14px; line-height: 1.6;">This link expires in 1 hour.</p>
                      <p style="margin: 0 0 20px; color: #6a6a6a; font-size: 14px; line-height: 1.6;">If you did not expect this, you can ignore this email.</p>
                      <p style="margin: 0; color: #0066cc; font-size: 14px; word-break: break-all;">${resetUrl}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Hi ${firstName},

${introLine}

Reset your password using this link:
${resetUrl}

This link expires in 1 hour.
If you did not expect this, you can ignore this email.`,
    });

    console.log("Password reset email sent successfully");
    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}
