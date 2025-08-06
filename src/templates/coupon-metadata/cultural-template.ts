import { CouponMetadataTemplate, ActivityType, CouponAttribute } from "@/types/coupon-metadata";

export const culturalTemplate: CouponMetadataTemplate = {
  activity_type: ActivityType.CULTURAL,
  default_attributes: [
    {
      trait_type: "Cultural Type",
      value: "Museum Visit"
    },
    {
      trait_type: "Language",
      value: "English, Spanish"
    },
    {
      trait_type: "Duration",
      value: "2 hours"
    },
    {
      trait_type: "Guided Tour",
      value: "Available"
    },
    {
      trait_type: "Educational Content",
      value: "Historical, Artistic"
    }
  ],
  required_fields: [
    "coupon_title",
    "coupon_description",
    "business_info",
    "discount_info",
    "validity_period", 
    "redemption_conditions",
    "region",
    "project_reference"
  ],
  validation_rules: {
    max_guests: (value: number) => value > 0 && value <= 25,
    advance_booking_required: (value: boolean) => typeof value === "boolean",
    booking_notice_days: (value: number) => value >= 0 && value <= 7,
    age_appropriate: () => true
  }
};