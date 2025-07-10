import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

export function encrypt(text: string, passphrase: string): string {
  const key = crypto.createHash('sha256').update(passphrase).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedData: string, passphrase: string): string {
  const [ivHex, encrypted] = encryptedData.split(':');
  const key = crypto.createHash('sha256').update(passphrase).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
