const nodemailer = require('nodemailer');
const logger = require('./logger');

const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : null;

exports.sendEmail = async (to, subject, html, text) => {
  if (!transporter) {
    logger.warn(`SMTP not configured — skipping email to ${to} ("${subject}"). Add SMTP_HOST/SMTP_USER/SMTP_PASS in .env to enable real email delivery.`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text
    });
    logger.info(`Email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    throw error;
  }
};

exports.sendOtpEmail = async (user, code) => {
  const minutes = parseInt(process.env.OTP_EXPIRE_MINUTES) || 10;
  const html = `
    <h2>Verify your HomoDentHealth account</h2>
    <p>Hi ${user.firstName || ''},</p>
    <p>Your verification code is:</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p>
    <p>This code expires in ${minutes} minutes. If you didn't request this, you can ignore this email.</p>
  `;
  await exports.sendEmail(user.email, 'Your HomoDentHealth verification code', html, `Your verification code is ${code}. It expires in ${minutes} minutes.`);
};

exports.sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/auth?token=${token}`;
  const html = `
    <h2>Welcome to HomoDentHealth</h2>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${verificationUrl}">Verify Email</a>
    <p>This link expires in 24 hours.</p>
  `;
  await exports.sendEmail(user.email, 'Email Verification', html);
};

exports.sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth?reset-token=${token}`;
  const html = `
    <h2>Password Reset Request</h2>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>This link expires in 1 hour.</p>
  `;
  await exports.sendEmail(user.email, 'Password Reset', html);
};

exports.sendAppointmentConfirmation = async (appointment, clinic, user) => {
  const html = `
    <h2>Appointment Confirmed</h2>
    <p>Dear ${user.firstName},</p>
    <p>Your appointment has been confirmed:</p>
    <ul>
      <li><strong>Clinic:</strong> ${clinic.name}</li>
      <li><strong>Date:</strong> ${appointment.appointmentDate.toLocaleDateString()}</li>
      <li><strong>Time:</strong> ${appointment.timeSlot.startTime}</li>
      <li><strong>Service:</strong> ${appointment.serviceType}</li>
    </ul>
    <p>See you soon!</p>
  `;
  await exports.sendEmail(user.email, 'Appointment Confirmed', html);
};

exports.sendAppointmentReminder = async (appointment, clinic, user) => {
  const html = `
    <h2>Appointment Reminder</h2>
    <p>Dear ${user.firstName},</p>
    <p>This is a reminder of your upcoming appointment:</p>
    <ul>
      <li><strong>Clinic:</strong> ${clinic.name}</li>
      <li><strong>Date:</strong> ${appointment.appointmentDate.toLocaleDateString()}</li>
      <li><strong>Time:</strong> ${appointment.timeSlot.startTime}</li>
    </ul>
    <p>Please arrive 10 minutes early.</p>
  `;
  await exports.sendEmail(user.email, 'Appointment Reminder', html);
};
