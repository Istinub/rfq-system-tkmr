import nodemailer from 'nodemailer';

type EmailPayload = {
  to: string[];
  subject: string;
  text: string;
  html?: string;
};

type MailResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

let cachedTransport: nodemailer.Transporter | null = null;
let cachedConfig: SmtpConfig | null = null;

const getSmtpConfig = (): SmtpConfig | null => {
  const host = process.env.SMTP_HOST;
  const portValue = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || '';

  if (!host || !portValue || !user || !pass || !from) {
    return null;
  }

  const port = Number(portValue);
  if (!Number.isFinite(port)) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    from,
    secure: port === 465,
  };
};

const getTransport = (): { transport: nodemailer.Transporter | null; config: SmtpConfig | null } => {
  const config = getSmtpConfig();
  if (!config) {
    return { transport: null, config: null };
  }

  if (cachedTransport && cachedConfig) {
    return { transport: cachedTransport, config: cachedConfig };
  }

  cachedConfig = config;
  cachedTransport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return { transport: cachedTransport, config: cachedConfig };
};

export const sendEmail = async (payload: EmailPayload): Promise<MailResult> => {
  const recipients = payload.to.map((value) => value.trim()).filter(Boolean);
  if (recipients.length === 0) {
    console.warn('[Mailer] No recipients specified.');
    return { ok: false, skipped: true, error: 'No recipients configured for this email.' };
  }

  const { transport, config } = getTransport();
  if (!transport || !config) {
    console.warn('[Mailer] SMTP is not configured; skipping email.');
    return { ok: false, skipped: true, error: 'SMTP is not configured.' };
  }

  try {
    await transport.sendMail({
      from: config.from,
      to: recipients.join(','),
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to send email.',
    };
  }
};
