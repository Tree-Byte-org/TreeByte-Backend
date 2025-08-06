import { CouponMetadataTemplate, ActivityType, CouponAttribute } from "@/types/coupon-metadata";

export const restaurantTemplate: CouponMetadataTemplate = {
  activity_type: ActivityType.RESTAURANT,
  default_attributes: [
    {
      trait_type: "Cuisine Type",
      value: "Local Cuisine"
    },
    {
      trait_type: "Dining Style",
      value: "Casual"
    },
    {
      trait_type: "Operating Hours",
      value: "11:00 AM - 10:00 PM"
    },
    {
      trait_type: "Meal Types",
      value: "Lunch, Dinner"
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
    max_guests: (value: number) => value > 0 && value <= 12,
    minimum_spend: (value: number) => value >= 10,
    reservation_required: () => true,
    dietary_restrictions_accommodated: () => true
  }
};