import db from '@/lib/db/db';
import { Buffer } from 'buffer';
import { MailerService } from '@/services/mailer.service';
import { getRecoveryEmailTemplate } from '@/templates/emails/recovery-backup-email';

export class RecoveryService {
  private mailerService: MailerService;

  constructor(mailerService: MailerService) {
    this.mailerService = mailerService;
  }

  async exportEncryptedKey(email: string): Promise<string> {
    const { data, error } = await db
      .from('users')
      .select('secret_key_enc')
      .eq('email', email)
      .single();

    if (error || !data?.secret_key_enc) {
      throw new Error('Encrypted key not found for this email.');
    }

    return Buffer.from(data.secret_key_enc, 'utf-8').toString('base64');
  }

  async sendEncryptedKeyByEmail(email: string): Promise<void> {
    const { data, error } = await db
      .from('users')
      .select('secret_key_enc')
      .eq('email', email)
      .single();

    if (error || !data?.secret_key_enc) {
      throw new Error('Encrypted key not found for this email.');
    }

    const content = data.secret_key_enc;
    const template = getRecoveryEmailTemplate(content); // ✅ pasamos la clave cifrada

    await this.mailerService.sendMailWithAttachment({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
      filename: 'treebyte-wallet-backup.txt',
      content,
    });
  }
}
