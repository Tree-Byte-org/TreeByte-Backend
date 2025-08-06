import { CouponMetadataTemplate, ActivityType, CouponAttribute } from "@/types/coupon-metadata";

export const hotelTemplate: CouponMetadataTemplate = {
  activity_type: ActivityType.HOTEL,
  default_attributes: [
    {
      trait_type: "Check-in Policy",
      value: "3:00 PM"
    },
    {
      trait_type: "Check-out Policy", 
      value: "11:00 AM"
    },
    {
      trait_type: "Accommodation Type",
      value: "Hotel"
    },
    {
      trait_type: "Amenities",
      value: "WiFi, Breakfast"
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
    max_guests: (value: number) => value > 0 && value <= 20,
    advance_booking_required: () => true,
    booking_notice_days: (value: number) => value >= 1 && value <= 30,
    minimum_stay_nights: (value: number) => value >= 1 && value <= 14
  }
};