import { CouponMetadataTemplate, ActivityType, CouponAttribute } from "@/types/coupon-metadata";

export const adventureTemplate: CouponMetadataTemplate = {
  activity_type: ActivityType.ADVENTURE,
  default_attributes: [
    {
      trait_type: "Adventure Type",
      value: "Eco-Tour"
    },
    {
      trait_type: "Difficulty Level",
      value: "Moderate"
    },
    {
      trait_type: "Duration",
      value: "4 hours"
    },
    {
      trait_type: "Equipment Provided",
      value: "Yes"
    },
    {
      trait_type: "Age Restriction",
      value: "12+"
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
    max_guests: (value: number) => value > 0 && value <= 15,
    advance_booking_required: () => true,
    booking_notice_days: (value: number) => value >= 2 && value <= 14,
    physical_fitness_required: () => true,
    weather_dependent: () => true
  }
};