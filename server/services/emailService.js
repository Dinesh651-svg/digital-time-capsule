import dotenv from "dotenv";
import nodemailer from "nodemailer";

// if this module is imported before server.js has run its dotenv.config call,
// load variables again here. Safe to call multiple times.
dotenv.config();

const getTransporter = () => {
  const { SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
};

const sendMailSafe = async (mailOptions) => {
  const transporter = getTransporter();

  if (!transporter) {
    return { sent: false, reason: "not_configured" };
  }

  try {
    await transporter.sendMail(mailOptions);
    return { sent: true };
  } catch (error) {
    console.warn("Email delivery failed:", error.message);
    return { sent: false, reason: error.code || "send_failed" };
  }
};

export const sendOTPEmail = async (to, otp) => {
  return sendMailSafe({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Digital Time Capsule OTP",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Your OTP Code</h2>
        <p>Your emergency unlock OTP is:</p>
        <h1 style="letter-spacing: 2px;">${otp}</h1>
        <p>This OTP will expire soon.</p>
      </div>
    `
  });
};

export const sendRegistrationEmail = async (to, name) => {
  return sendMailSafe({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Welcome to Digital Time Capsule",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Welcome, ${name}</h2>
        <p>Your account has been created successfully.</p>
      </div>
    `
  });
};

export const sendCapsuleUnlockedEmail = async (to, title, method = "time") => {
  return sendMailSafe({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Capsule Unlocked",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Your capsule is unlocked</h2>
        <p><strong>${title}</strong> has been unlocked by ${method}.</p>
      </div>
    `
  });
};

export const sendNomineeInviteEmail = async (to, title) => {
  return sendMailSafe({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Nominee Invitation",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>You were added as a nominee</h2>
        <p>You were nominated for the capsule: <strong>${title}</strong>.</p>
      </div>
    `
  });
};

export const sendNomineeVerifiedEmail = async (to, title) => {
  return sendMailSafe({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Nominee Verified",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Nominee Verified</h2>
        <p>You have been verified for capsule: <strong>${title}</strong>.</p>
      </div>
    `
  });
};