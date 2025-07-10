export function getRecoveryEmailTemplate(encryptedKey: string) {
  return {
    subject: '🌱 TreeByte Wallet Backup - Your Encrypted Key',
    text: `
          Your encrypted wallet backup is ready.

          Encrypted Key (attached as a file):
          -----BEGIN TREEBYTE ENCRYPTED WALLET-----
          ${encryptedKey}
          -----END TREEBYTE ENCRYPTED WALLET-----

          TreeByte Team
              `.trim(),
              html: `
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f2f5f1; padding: 32px 0; font-family: Arial, sans-serif;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
                  
                  <!-- HEADER -->
                  <tr style="background-color: #2e7d32;">
                    <td align="center" style="padding: 24px;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">TreeByte Wallet Backup</h1>
                      <p style="color: #c8e6c9; font-size: 14px; margin: 8px 0 0;">
                        Your encrypted wallet is ready for secure storage
                      </p>
                    </td>
                  </tr>

                  <!-- CONTENT -->
                  <tr>
                    <td style="padding: 24px 32px;">
                      
                      <!-- BACKUP DETAILS -->
                      <h2 style="color: #388e3c; font-size: 18px; margin-top: 0;">✅ Backup Details</h2>
                      <p><strong>Encrypted Key:</strong></p>
                      <pre style="background-color: #f8f8f8; padding: 12px; border: 1px dashed #ccc; font-size: 13px; white-space: pre-wrap; word-break: break-word; border-radius: 6px;">
          -----BEGIN TREEBYTE ENCRYPTED WALLET-----
          ${encryptedKey}
          -----END TREEBYTE ENCRYPTED WALLET-----
                      </pre>
                      <p style="font-size: 12px; color: #888;">
                        This key is also attached as <em>treebyte-wallet-backup.txt</em>
                      </p>

                      <!-- SECURITY TIPS -->
                      <div style="margin-top: 32px; background-color: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 6px; padding: 20px;">
                        <h3 style="color: #2e7d32; margin-top: 0;">⚠️ Critical Security Information</h3>
                        <ul style="padding-left: 20px; color: #333; font-size: 14px;">
                          <li>Store this backup in <strong>multiple secure locations</strong></li>
                          <li>Remember your <strong>passphrase</strong> – it's required to decrypt</li>
                          <li><strong>Never share</strong> this email or the attached file</li>
                          <li>Consider <strong>deleting this email</strong> after saving your backup safely</li>
                        </ul>
                      </div>

                      <!-- WHAT'S NEXT -->
                      <div style="margin-top: 32px;">
                        <h3 style="color: #007e5c;">📌 What’s Next?</h3>
                        <ol style="padding-left: 20px; font-size: 14px;">
                          <li><strong>Download your backup</strong> from the attachment</li>
                          <li><strong>Store securely</strong> in a password manager or encrypted drive</li>
                          <li><strong>Verify</strong> you can restore using your passphrase</li>
                        </ol>
                      </div>

                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td align="center" style="padding: 16px; background-color: #f2f5f1; color: #888; font-size: 12px;">
                      © ${new Date().getFullYear()} TreeByte Inc. • Secure Digital Wallet<br/>
                      This is an automated email — do not reply
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
              `,
  };
}
