import { 
  uploadCouponMetadataToIPFS, 
  CouponMetadata, 
  IPFSUploadResult 
} from "@/lib/ipfs/upload-to-ipfs";
import logger from "@/utils/logger";

export interface CouponIPFSConfig {
  maxRetries: number;
  retryDelay: number;
  backupGateways: string[];
}

const defaultConfig: CouponIPFSConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backupGateways: [
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://dweb.link/ipfs/"
  ],
};

export class CouponIPFSService {
  private config: CouponIPFSConfig;

  constructor(config: Partial<CouponIPFSConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async uploadCouponMetadata(
    couponMetadata: CouponMetadata
  ): Promise<IPFSUploadResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        logger.info(`Uploading coupon metadata (attempt ${attempt}/${this.config.maxRetries})`, {
          tokenId: couponMetadata.tokenId,
          attempt,
        });

        this.validateCouponMetadata(couponMetadata);
        
        const result = await uploadCouponMetadataToIPFS(couponMetadata);

        if (result.success) {
          logger.info("Coupon metadata uploaded successfully", {
            tokenId: couponMetadata.tokenId,
            ipfsHash: result.ipfsHash,
            metadataSize: result.metadataSize,
          });

          return result;
        } else {
          throw new Error("IPFS upload returned failure status");
        }
      } catch (error) {
        lastError = error as Error;
        
        logger.warn(`Coupon metadata upload failed (attempt ${attempt})`, {
          tokenId: couponMetadata.tokenId,
          error: error instanceof Error ? error.message : String(error),
          attempt,
        });

        if (attempt < this.config.maxRetries) {
          await this.sleep(this.config.retryDelay * attempt);
        }
      }
    }

    logger.error("All coupon metadata upload attempts failed", {
      tokenId: couponMetadata.tokenId,
      maxRetries: this.config.maxRetries,
      finalError: lastError?.message,
    });

    return {
      ipfsHash: "",
      ipfsUrl: "",
      success: false,
    };
  }

  async retrieveCouponMetadataFromIPFS(hash: string): Promise<CouponMetadata | null> {
    if (!this.validateIPFSHash(hash)) {
      throw new Error(`Invalid IPFS hash: ${hash}`);
    }

    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${hash}`,
      ...this.config.backupGateways.map(gateway => `${gateway}${hash}`)
    ];

    for (const gateway of gateways) {
      try {
        logger.info(`Attempting to retrieve coupon metadata from ${gateway}`);
        
        const response = await fetch(gateway, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const metadata = await response.json();
        
        if (this.isValidCouponMetadata(metadata)) {
          logger.info("Successfully retrieved coupon metadata", {
            ipfsHash: hash,
            tokenId: metadata.tokenId,
            gateway,
          });
          
          return metadata as CouponMetadata;
        } else {
          throw new Error("Retrieved data is not valid coupon metadata");
        }
      } catch (error) {
        logger.warn(`Failed to retrieve from gateway ${gateway}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.error("Failed to retrieve coupon metadata from all gateways", {
      ipfsHash: hash,
      attemptedGateways: gateways.length,
    });

    return null;
  }

  validateIPFSHash(hash: string): boolean {
    if (!hash || typeof hash !== 'string') {
      return false;
    }

    const ipfsHashRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^baf[a-z2-7]{56}$/;
    return ipfsHashRegex.test(hash);
  }

  getCouponMetadataURL(hash: string): string {
    if (!this.validateIPFSHash(hash)) {
      throw new Error(`Invalid IPFS hash: ${hash}`);
    }
    
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }

  async pingIPFSAvailability(): Promise<boolean> {
    try {
      const testHash = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"; // Hello World IPFS hash
      const url = `https://gateway.pinata.cloud/ipfs/${testHash}`;
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });

      const isAvailable = response.ok;
      
      logger.info("IPFS availability check", {
        available: isAvailable,
        statusCode: response.status,
      });

      return isAvailable;
    } catch (error) {
      logger.error("IPFS availability check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      
      return false;
    }
  }

  private validateCouponMetadata(metadata: CouponMetadata): void {
    const requiredFields = ['name', 'description', 'tokenId'];
    const missingFields = requiredFields.filter(field => 
      !metadata[field as keyof CouponMetadata]
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (metadata.attributes && !Array.isArray(metadata.attributes)) {
      throw new Error('Attributes must be an array');
    }

    if (metadata.attributes) {
      for (const attr of metadata.attributes) {
        if (!attr.trait_type || attr.value === undefined) {
          throw new Error('Each attribute must have trait_type and value');
        }
      }
    }

    const metadataString = JSON.stringify(metadata);
    if (Buffer.byteLength(metadataString, 'utf8') > 1024 * 1024) {
      throw new Error('Metadata size exceeds 1MB limit');
    }
  }

  private isValidCouponMetadata(data: any): boolean {
    try {
      return (
        data &&
        typeof data === 'object' &&
        typeof data.name === 'string' &&
        typeof data.description === 'string' &&
        typeof data.tokenId === 'string' &&
        (!data.attributes || Array.isArray(data.attributes))
      );
    } catch {
      return false;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const couponIPFSService = new CouponIPFSService();