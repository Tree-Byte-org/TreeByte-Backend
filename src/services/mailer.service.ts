import nodemailer from 'nodemailer';

interface MailAttachmentOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  filename: string;
  content: string;
}

export class MailerService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER!,
        pass: process.env.MAIL_PASS!,
      },
    });
  }

  async sendMailWithAttachment({
    to,
    subject,
    text,
    html,
    filename,
    content,
  }: MailAttachmentOptions) {
    await this.transporter.sendMail({
      from: `"TreeByte" <${process.env.MAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments: [
        {
          filename,
          content,
        },
      ],
    });
  }
}
