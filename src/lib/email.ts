import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  companyId?: string | null;
};

export async function sendEmail({ to, subject, html, companyId }: SendEmailOptions) {
  let transporter;
  let fromAddress = process.env.DEFAULT_EMAIL_FROM || "PropPreserve <noreply@proppreserve.com>";

  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpFrom: true },
    });

    if (company && company.smtpHost && company.smtpUser && company.smtpPass) {
      transporter = nodemailer.createTransport({
        host: company.smtpHost,
        port: company.smtpPort || 587,
        secure: company.smtpPort === 465,
        auth: {
          user: company.smtpUser,
          pass: company.smtpPass,
        },
      });

      if (company.smtpFrom) {
        fromAddress = company.smtpFrom;
      }
    }
  }

  // Fallback to system default if no company SMTP is configured
  if (!transporter) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("No SMTP configuration found for company or system. Email not sent.");
      return { success: false, error: "No SMTP configuration" };
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });
    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: String(error) };
  }
}
