import {
  CouponMetadata,
  CouponAttribute,
  MetadataGenerationInput,
  MetadataValidationResult,
  ActivityType,
  CouponMetadataTemplate
} from "@/types/coupon-metadata";
import { CouponMetadataUtils } from "@/utils/coupon-metadata-utils";
import { getTemplateForActivity } from "@/templates/coupon-metadata";

export class CouponMetadataService {
  private static readonly DEFAULT_IMAGE_BASE_URL = "https://treebyte.eco/images/coupons";
  
  static generateCouponMetadata(input: MetadataGenerationInput): CouponMetadata {
    this.validateInput(input);
    
    const baseAttributes = this.generateBaseAttributes(input);
    const customAttributes = input.custom_attributes || [];
    
    return {
      name: input.coupon_title,
      description: input.coupon_description,
      image: input.image_url || this.generateDefaultImageUrl(input.activity_type, input.business_info.name),
      external_url: input.project_reference.project_url || `https://treebyte.eco/projects/${input.project_reference.project_id}`,
      attributes: [...baseAttributes, ...customAttributes]
    };
  }

  private static generateBaseAttributes(input: MetadataGenerationInput): CouponAttribute[] {
    const attributes: CouponAttribute[] = [
      {
        trait_type: "Activity Type",
        value: this.formatActivityType(input.activity_type)
      },
      {
        trait_type: "Business Name",
        value: input.business_info.name
      },
      {
        trait_type: "Business Address",
        value: input.business_info.address
      },
      {
        trait_type: "Region",
        value: input.region
      },
      {
        trait_type: "Valid From",
        value: this.formatDateForMetadata(input.validity_period.valid_from),
        display_type: "date"
      },
      {
        trait_type: "Valid Until",
        value: this.formatDateForMetadata(input.validity_period.valid_until),
        display_type: "date"
      },
      {
        trait_type: "Project Name",
        value: input.project_reference.project_name
      }
    ];

    if (input.discount_info.percentage) {
      attributes.push({
        trait_type: "Discount Percentage",
        value: input.discount_info.percentage,
        display_type: "boost_percentage",
        max_value: 100
      });
    }

    if (input.discount_info.amount) {
      attributes.push({
        trait_type: "Discount Amount",
        value: input.discount_info.amount,
        display_type: "number"
      });
      
      if (input.discount_info.currency) {
        attributes.push({
          trait_type: "Currency",
          value: input.discount_info.currency
        });
      }
    }

    if (input.redemption_conditions.max_guests) {
      attributes.push({
        trait_type: "Max Guests",
        value: input.redemption_conditions.max_guests,
        display_type: "number"
      });
    }

    if (input.redemption_conditions.minimum_spend) {
      attributes.push({
        trait_type: "Minimum Spend",
        value: input.redemption_conditions.minimum_spend,
        display_type: "number"
      });
    }

    if (input.redemption_conditions.advance_booking_required) {
      attributes.push({
        trait_type: "Advance Booking Required",
        value: "Yes"
      });
      
      if (input.redemption_conditions.booking_notice_days) {
        attributes.push({
          trait_type: "Booking Notice (Days)",
          value: input.redemption_conditions.booking_notice_days,
          display_type: "number"
        });
      }
    }

    if (input.business_info.contact.phone) {
      attributes.push({
        trait_type: "Business Phone",
        value: input.business_info.contact.phone
      });
    }

    if (input.business_info.contact.email) {
      attributes.push({
        trait_type: "Business Email",
        value: input.business_info.contact.email
      });
    }

    if (input.validity_period.blackout_dates && input.validity_period.blackout_dates.length > 0) {
      attributes.push({
        trait_type: "Has Blackout Dates",
        value: "Yes"
      });
      
      attributes.push({
        trait_type: "Blackout Dates Count",
        value: input.validity_period.blackout_dates.length,
        display_type: "number"
      });
    }

    if (input.redemption_conditions.terms_and_conditions.length > 0) {
      attributes.push({
        trait_type: "Terms Count",
        value: input.redemption_conditions.terms_and_conditions.length,
        display_type: "number"
      });
    }

    return attributes;
  }

  static validateMetadata(metadata: CouponMetadata): MetadataValidationResult {
    return CouponMetadataUtils.validateMetadata(metadata);
  }

  static validateInput(input: MetadataGenerationInput): void {
    const errors: string[] = [];

    if (!input.coupon_title || input.coupon_title.trim().length === 0) {
      errors.push("Coupon title is required");
    }

    if (!input.coupon_description || input.coupon_description.trim().length === 0) {
      errors.push("Coupon description is required");
    }

    if (!Object.values(ActivityType).includes(input.activity_type)) {
      errors.push("Invalid activity type");
    }

    if (!input.business_info?.name || input.business_info.name.trim().length === 0) {
      errors.push("Business name is required");
    }

    if (!input.business_info?.address || input.business_info.address.trim().length === 0) {
      errors.push("Business address is required");
    }

    if (!input.business_info?.contact?.phone && !input.business_info?.contact?.email) {
      errors.push("At least one contact method (phone or email) is required");
    }

    if (input.business_info?.contact?.email && !this.isValidEmail(input.business_info.contact.email)) {
      errors.push("Invalid email format");
    }

    if (!input.validity_period?.valid_from) {
      errors.push("Valid from date is required");
    }

    if (!input.validity_period?.valid_until) {
      errors.push("Valid until date is required");
    }

    if (input.validity_period?.valid_from && input.validity_period?.valid_until) {
      if (input.validity_period.valid_from >= input.validity_period.valid_until) {
        errors.push("Valid until date must be after valid from date");
      }

      if (input.validity_period.valid_until <= new Date()) {
        errors.push("Valid until date must be in the future");
      }
    }

    if (input.discount_info?.percentage && (input.discount_info.percentage <= 0 || input.discount_info.percentage > 100)) {
      errors.push("Discount percentage must be between 1 and 100");
    }

    if (input.discount_info?.amount && input.discount_info.amount <= 0) {
      errors.push("Discount amount must be greater than 0");
    }

    if (!input.discount_info?.percentage && !input.discount_info?.amount) {
      errors.push("Either discount percentage or discount amount is required");
    }

    if (!input.region || input.region.trim().length === 0) {
      errors.push("Region is required");
    }

    if (!input.project_reference?.project_id || input.project_reference.project_id.trim().length === 0) {
      errors.push("Project ID is required");
    }

    if (!input.project_reference?.project_name || input.project_reference.project_name.trim().length === 0) {
      errors.push("Project name is required");
    }

    if (!input.redemption_conditions?.terms_and_conditions || input.redemption_conditions.terms_and_conditions.length === 0) {
      errors.push("At least one term and condition is required");
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(", ")}`);
    }
  }

  static formatDateForMetadata(date: Date): string {
    return CouponMetadataUtils.formatDateForMetadata(date);
  }

  static sanitizeTextFields(text: string): string {
    return CouponMetadataUtils.sanitizeTextFields(text);
  }

  static generateCouponImage(businessInfo: { name: string }, activityType: ActivityType): string {
    return CouponMetadataUtils.generateCouponImage(businessInfo, activityType);
  }

  private static formatActivityType(activityType: ActivityType): string {
    return activityType.charAt(0).toUpperCase() + activityType.slice(1);
  }

  private static generateDefaultImageUrl(activityType: ActivityType, businessName: string): string {
    const sanitizedName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${this.DEFAULT_IMAGE_BASE_URL}/${activityType}/${sanitizedName}.jpg`;
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}