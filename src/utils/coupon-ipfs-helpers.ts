import { CouponMetadata } from "@/lib/ipfs/upload-to-ipfs";

export interface CouponMetadataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IPFSHealthStatus {
  isHealthy: boolean;
  responseTime: number;
  gateway: string;
  error?: string;
}

export class CouponIPFSHelpers {
  static validateCouponMetadataStructure(metadata: any): CouponMetadataValidationResult {
    const result: CouponMetadataValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!metadata || typeof metadata !== 'object') {
      result.errors.push('Metadata must be a valid object');
      result.isValid = false;
      return result;
    }

    if (!metadata.name || typeof metadata.name !== 'string') {
      result.errors.push('Name is required and must be a string');
      result.isValid = false;
    } else if (metadata.name.length < 3) {
      result.warnings.push('Name should be at least 3 characters long');
    }

    if (!metadata.description || typeof metadata.description !== 'string') {
      result.errors.push('Description is required and must be a string');
      result.isValid = false;
    } else if (metadata.description.length < 10) {
      result.warnings.push('Description should be at least 10 characters long');
    }

    if (!metadata.tokenId || typeof metadata.tokenId !== 'string') {
      result.errors.push('TokenId is required and must be a string');
      result.isValid = false;
    }

    if (metadata.image && typeof metadata.image !== 'string') {
      result.errors.push('Image must be a string URL');
      result.isValid = false;
    }

    if (metadata.attributes) {
      if (!Array.isArray(metadata.attributes)) {
        result.errors.push('Attributes must be an array');
        result.isValid = false;
      } else {
        metadata.attributes.forEach((attr: any, index: number) => {
          if (!attr || typeof attr !== 'object') {
            result.errors.push(`Attribute at index ${index} must be an object`);
            result.isValid = false;
            return;
          }

          if (!attr.trait_type || typeof attr.trait_type !== 'string') {
            result.errors.push(`Attribute at index ${index} must have a trait_type string`);
            result.isValid = false;
          }

          if (attr.value === undefined || attr.value === null) {
            result.errors.push(`Attribute at index ${index} must have a value`);
            result.isValid = false;
          }

          if (typeof attr.value !== 'string' && typeof attr.value !== 'number') {
            result.warnings.push(`Attribute at index ${index} value should be string or number`);
          }
        });
      }
    }

    if (metadata.validUntil && typeof metadata.validUntil !== 'string') {
      result.errors.push('validUntil must be a string (ISO date format recommended)');
      result.isValid = false;
    }

    if (metadata.discountAmount !== undefined) {
      if (typeof metadata.discountAmount !== 'number' || metadata.discountAmount < 0) {
        result.errors.push('discountAmount must be a non-negative number');
        result.isValid = false;
      }
    }

    if (metadata.discountPercentage !== undefined) {
      if (typeof metadata.discountPercentage !== 'number' || 
          metadata.discountPercentage < 0 || 
          metadata.discountPercentage > 100) {
        result.errors.push('discountPercentage must be a number between 0 and 100');
        result.isValid = false;
      }
    }

    if (metadata.maxUses !== undefined) {
      if (typeof metadata.maxUses !== 'number' || metadata.maxUses < 1) {
        result.errors.push('maxUses must be a positive number');
        result.isValid = false;
      }
    }

    if (metadata.currentUses !== undefined) {
      if (typeof metadata.currentUses !== 'number' || metadata.currentUses < 0) {
        result.errors.push('currentUses must be a non-negative number');
        result.isValid = false;
      }
    }

    if (metadata.minPurchaseAmount !== undefined) {
      if (typeof metadata.minPurchaseAmount !== 'number' || metadata.minPurchaseAmount < 0) {
        result.errors.push('minPurchaseAmount must be a non-negative number');
        result.isValid = false;
      }
    }

    if (metadata.discountAmount && metadata.discountPercentage) {
      result.warnings.push('Both discountAmount and discountPercentage are set. Consider using only one.');
    }

    return result;
  }

  static optimizeCouponMetadata(metadata: CouponMetadata): CouponMetadata {
    const optimized = { ...metadata };

    optimized.name = optimized.name.trim();
    optimized.description = optimized.description.trim();

    if (optimized.attributes) {
      optimized.attributes = optimized.attributes
        .filter(attr => attr.trait_type && attr.value !== undefined)
        .map(attr => ({
          trait_type: attr.trait_type.trim(),
          value: attr.value,
        }));
    }

    if (optimized.couponType) {
      optimized.couponType = optimized.couponType.trim().toLowerCase();
    }

    return optimized;
  }

  static compressMetadata(metadata: CouponMetadata): string {
    const compressed = this.optimizeCouponMetadata(metadata);
    
    return JSON.stringify(compressed, null, 0);
  }

  static estimateMetadataSize(metadata: CouponMetadata): number {
    const jsonString = JSON.stringify(metadata);
    return Buffer.byteLength(jsonString, 'utf8');
  }

  static generateCouponFileName(tokenId: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    return `coupon-metadata-${tokenId}-${ts}.json`;
  }

  static parseIPFSUrl(url: string): { hash: string; gateway: string } | null {
    const ipfsUrlRegex = /^https?:\/\/([^\/]+)\/ipfs\/([A-Za-z0-9]+)$/;
    const match = url.match(ipfsUrlRegex);
    
    if (!match) {
      return null;
    }

    return {
      gateway: `https://${match[1]}`,
      hash: match[2],
    };
  }

  static async checkIPFSGatewayHealth(gateway: string): Promise<IPFSHealthStatus> {
    const testHash = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
    const url = `${gateway}/ipfs/${testHash}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      return {
        isHealthy: response.ok,
        responseTime,
        gateway,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        gateway,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static async findFastestIPFSGateway(gateways: string[]): Promise<string> {
    const healthChecks = await Promise.allSettled(
      gateways.map(gateway => this.checkIPFSGatewayHealth(gateway))
    );

    const healthyGateways = healthChecks
      .filter((result): result is PromiseFulfilledResult<IPFSHealthStatus> => 
        result.status === 'fulfilled' && result.value.isHealthy
      )
      .map(result => result.value)
      .sort((a, b) => a.responseTime - b.responseTime);

    if (healthyGateways.length === 0) {
      throw new Error('No healthy IPFS gateways available');
    }

    return healthyGateways[0].gateway;
  }

  static createCouponMetadataTemplate(tokenId: string): CouponMetadata {
    return {
      name: `Coupon #${tokenId}`,
      description: "A TreeByte platform coupon NFT providing discounts and benefits.",
      image: "",
      tokenId,
      attributes: [
        {
          trait_type: "Type",
          value: "Discount Coupon",
        },
        {
          trait_type: "Created",
          value: new Date().toISOString().split('T')[0],
        },
      ],
      couponType: "general",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      maxUses: 1,
      currentUses: 0,
    };
  }

  static isExpiredCoupon(metadata: CouponMetadata): boolean {
    if (!metadata.validUntil) {
      return false;
    }

    try {
      const expiryDate = new Date(metadata.validUntil);
      return expiryDate < new Date();
    } catch {
      return false;
    }
  }

  static isFullyUsedCoupon(metadata: CouponMetadata): boolean {
    if (metadata.maxUses === undefined || metadata.currentUses === undefined) {
      return false;
    }

    return metadata.currentUses >= metadata.maxUses;
  }

  static isCouponValid(metadata: CouponMetadata): boolean {
    return !this.isExpiredCoupon(metadata) && !this.isFullyUsedCoupon(metadata);
  }
}