const nodemailer = require('nodemailer');
require('dotenv').config();

const smtpConfigured =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASSWORD;

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure:
        String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : null;

const sendEmail = async ({
  to,
  subject,
  text,
  html,
}) => {
  if (!transporter) {
    console.warn(
      '⚠️ Email not sent: SMTP is not configured.'
    );

    return {
      success: false,
      message: 'SMTP is not configured.',
    };
  }

  try {
    const info = await transporter.sendMail({
      from:
        process.env.SMTP_FROM ||
        process.env.SMTP_USER,

      to,
      subject,
      text,
      html,
    });

    console.log(
      `📧 Email sent to ${to}: ${info.messageId}`
    );

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(
      `❌ Email error for ${to}:`,
      error.message
    );

    return {
      success: false,
      message: error.message,
    };
  }
};

module.exports = {
  sendEmail,
};