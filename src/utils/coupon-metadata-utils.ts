import { CouponMetadata, MetadataValidationResult, ActivityType } from "@/types/coupon-metadata";

export class CouponMetadataUtils {
  static validateMetadata(metadata: CouponMetadata): MetadataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.push("Metadata name is required and cannot be empty");
    } else if (metadata.name.length > 100) {
      warnings.push("Metadata name exceeds 100 characters and may be truncated in NFT marketplaces");
    }

    if (!metadata.description || metadata.description.trim().length === 0) {
      errors.push("Metadata description is required and cannot be empty");
    } else if (metadata.description.length > 1000) {
      warnings.push("Metadata description exceeds 1000 characters and may be truncated");
    }

    if (!metadata.image || !this.isValidUrl(metadata.image)) {
      errors.push("Valid image URL is required for NFT display");
    }

    if (metadata.external_url && !this.isValidUrl(metadata.external_url)) {
      errors.push("External URL must be a valid URL if provided");
    }

    if (!metadata.attributes || !Array.isArray(metadata.attributes) || metadata.attributes.length === 0) {
      errors.push("At least one metadata attribute is required");
    } else {
      metadata.attributes.forEach((attr, index) => {
        if (!attr.trait_type || typeof attr.trait_type !== 'string' || attr.trait_type.trim().length === 0) {
          errors.push(`Attribute ${index + 1}: trait_type must be a non-empty string`);
        }
        
        if (attr.value === undefined || attr.value === null || 
            (typeof attr.value === 'string' && attr.value.trim().length === 0)) {
          errors.push(`Attribute ${index + 1} (${attr.trait_type}): value cannot be empty`);
        }

        if (attr.display_type && !['boost_number', 'boost_percentage', 'number', 'date'].includes(attr.display_type)) {
          errors.push(`Attribute ${index + 1} (${attr.trait_type}): invalid display_type`);
        }

        if (attr.display_type === 'boost_percentage' && typeof attr.value === 'number' && (attr.value < 0 || attr.value > 100)) {
          errors.push(`Attribute ${index + 1} (${attr.trait_type}): percentage values must be between 0 and 100`);
        }
      });
    }

    if (metadata.background_color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(metadata.background_color)) {
      warnings.push("Background color should be a valid hex color code (e.g., #FF0000)");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static formatDateForMetadata(date: Date): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error("Invalid date provided for metadata formatting");
    }
    return date.toISOString().split('T')[0];
  }

  static generateCouponImage(businessInfo: { name: string }, activityType: ActivityType): string {
    const sanitizedBusinessName = this.sanitizeForUrl(businessInfo.name);
    const baseUrl = process.env.COUPON_IMAGE_BASE_URL || "https://api.treebyte.eco/images/coupons";
    
    return `${baseUrl}/${activityType}/${sanitizedBusinessName}.jpg`;
  }

  static sanitizeTextFields(text: string): string {
    if (typeof text !== 'string') {
      throw new Error("Input must be a string");
    }
    
    return text
      .trim()
      .replace(/[<>\"'&]/g, '') 
      .replace(/\s+/g, ' ') 
      .substring(0, 500); 
  }

  static sanitizeForUrl(text: string): string {
    if (typeof text !== 'string') {
      throw new Error("Input must be a string");
    }
    
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') 
      .replace(/\s+/g, '-') 
      .replace(/-+/g, '-') 
      .replace(/^-|-$/g, ''); 
  }

  static generateUniqueMetadataId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `coupon-${timestamp}-${randomStr}`;
  }

  static extractRequiredAttributes(metadata: CouponMetadata): { [key: string]: any } {
    const requiredAttrs: { [key: string]: any } = {};
    
    const requiredTraitTypes = [
      'Activity Type',
      'Business Name', 
      'Business Address',
      'Region',
      'Valid From',
      'Valid Until',
      'Project Name'
    ];

    requiredTraitTypes.forEach(traitType => {
      const attr = metadata.attributes.find(a => a.trait_type === traitType);
      if (attr) {
        requiredAttrs[traitType.toLowerCase().replace(/\s+/g, '_')] = attr.value;
      }
    });

    return requiredAttrs;
  }

  static formatActivityTypeDisplay(activityType: ActivityType): string {
    const displayNames: Record<ActivityType, string> = {
      [ActivityType.HOTEL]: 'Hotel Accommodation',
      [ActivityType.RESTAURANT]: 'Restaurant & Dining',
      [ActivityType.ADVENTURE]: 'Adventure & Tours',
      [ActivityType.CULTURAL]: 'Cultural Experience'
    };
    
    return displayNames[activityType] || activityType.charAt(0).toUpperCase() + activityType.slice(1);
  }

  static validateDateRange(validFrom: Date, validUntil: Date): string[] {
    const errors: string[] = [];
    const now = new Date();
    
    if (!validFrom || !(validFrom instanceof Date) || isNaN(validFrom.getTime())) {
      errors.push("Valid from date is invalid");
    }
    
    if (!validUntil || !(validUntil instanceof Date) || isNaN(validUntil.getTime())) {
      errors.push("Valid until date is invalid");
    }
    
    if (validFrom && validUntil && validFrom >= validUntil) {
      errors.push("Valid until date must be after valid from date");
    }
    
    if (validUntil && validUntil <= now) {
      errors.push("Valid until date must be in the future");
    }
    
    const maxValidityPeriod = 365 * 2; // 2 years in days
    if (validFrom && validUntil) {
      const daysDiff = Math.ceil((validUntil.getTime() - validFrom.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > maxValidityPeriod) {
        errors.push(`Validity period cannot exceed ${maxValidityPeriod} days`);
      }
    }
    
    return errors;
  }

  static validateDiscountValue(percentage?: number, amount?: number, currency?: string): string[] {
    const errors: string[] = [];
    
    if (!percentage && !amount) {
      errors.push("Either discount percentage or discount amount must be provided");
    }
    
    if (percentage && (percentage <= 0 || percentage > 100)) {
      errors.push("Discount percentage must be between 1 and 100");
    }
    
    if (amount && amount <= 0) {
      errors.push("Discount amount must be greater than 0");
    }
    
    if (amount && !currency) {
      errors.push("Currency is required when discount amount is specified");
    }
    
    if (currency && currency.length !== 3) {
      errors.push("Currency must be a valid 3-letter ISO currency code (e.g., USD, EUR)");
    }
    
    return errors;
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}