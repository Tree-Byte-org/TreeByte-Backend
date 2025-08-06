import { ActivityType, CouponMetadataTemplate } from "@/types/coupon-metadata";
import { hotelTemplate } from "./hotel-template";
import { restaurantTemplate } from "./restaurant-template";
import { adventureTemplate } from "./adventure-template";
import { culturalTemplate } from "./cultural-template";

export const metadataTemplates: Record<ActivityType, CouponMetadataTemplate> = {
  [ActivityType.HOTEL]: hotelTemplate,
  [ActivityType.RESTAURANT]: restaurantTemplate,
  [ActivityType.ADVENTURE]: adventureTemplate,
  [ActivityType.CULTURAL]: culturalTemplate
};

export const getTemplateForActivity = (activityType: ActivityType): CouponMetadataTemplate => {
  return metadataTemplates[activityType];
};

export * from "./hotel-template";
export * from "./restaurant-template";
export * from "./adventure-template";
export * from "./cultural-template";