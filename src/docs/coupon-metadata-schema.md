# Coupon Metadata Schema Documentation

## Overview

The TreeByte coupon metadata system generates standardized JSON metadata for NFT coupons representing tourism activities. This metadata follows NFT standards and contains comprehensive information about the tourism activity, business details, expiration dates, and redemption conditions.

## Metadata Structure

### Standard NFT Fields

```typescript
interface CouponMetadata {
  name: string;              // Coupon title (e.g., "TreeByte Eco-Hotel Discount")
  description: string;       // Detailed coupon description
  image: string;            // URL to coupon visual/logo
  external_url?: string;    // Link to TreeByte project or business
  animation_url?: string;   // Optional animation/video URL
  background_color?: string; // Optional hex color code
  attributes: CouponAttribute[]; // Array of trait objects
}
```

### Attribute Structure

```typescript
interface CouponAttribute {
  trait_type: string;        // Name of the attribute
  value: string | number;    // Attribute value
  display_type?: "boost_number" | "boost_percentage" | "number" | "date";
  max_value?: number;        // Maximum value for percentage/number types
}
```

## Custom Attributes for Tourism Coupons

### Required Attributes

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `Activity Type` | string | Type of tourism activity | "Hotel", "Restaurant", "Adventure", "Cultural" |
| `Business Name` | string | Partner business name | "Green Valley Eco Resort" |
| `Business Address` | string | Physical address for redemption | "123 Forest Lane, Costa Rica" |
| `Region` | string | Geographic region/city | "Costa Rica Central Valley" |
| `Valid From` | date | Start date for coupon validity | "2024-01-01" |
| `Valid Until` | date | Expiration date | "2024-12-31" |
| `Project Name` | string | Related TreeByte project name | "Costa Rica Reforestation Initiative" |

### Discount Attributes

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `Discount Percentage` | number (boost_percentage) | Percentage discount offered | 25 |
| `Discount Amount` | number | Fixed amount discount | 50 |
| `Currency` | string | Currency code (if amount discount) | "USD" |

### Redemption Condition Attributes

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `Max Guests` | number | Maximum number of people | 4 |
| `Minimum Spend` | number | Minimum purchase amount | 200 |
| `Advance Booking Required` | string | Whether booking needed | "Yes" |
| `Booking Notice (Days)` | number | Days notice required | 7 |

### Business Contact Attributes

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `Business Phone` | string | Contact phone number | "+506 1234 5678" |
| `Business Email` | string | Contact email address | "info@business.com" |

### Special Condition Attributes

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `Has Blackout Dates` | string | Whether blackout dates exist | "Yes" |
| `Blackout Dates Count` | number | Number of blackout dates | 5 |
| `Terms Count` | number | Number of terms and conditions | 3 |

## Activity Type Templates

### Hotel Template

Default attributes for hotel accommodations:
- Check-in Policy: "3:00 PM"
- Check-out Policy: "11:00 AM"
- Accommodation Type: "Hotel"
- Amenities: "WiFi, Breakfast"

Validation rules:
- Max guests: 1-20
- Advance booking required: true
- Booking notice: 1-30 days

### Restaurant Template

Default attributes for dining experiences:
- Cuisine Type: "Local Cuisine"
- Dining Style: "Casual"
- Operating Hours: "11:00 AM - 10:00 PM"
- Meal Types: "Lunch, Dinner"

Validation rules:
- Max guests: 1-12
- Minimum spend: ≥ $10
- Reservation required: true

### Adventure Template

Default attributes for adventure activities:
- Adventure Type: "Eco-Tour"
- Difficulty Level: "Moderate"
- Duration: "4 hours"
- Equipment Provided: "Yes"
- Age Restriction: "12+"

Validation rules:
- Max guests: 1-15
- Advance booking required: true
- Booking notice: 2-14 days
- Physical fitness required: true
- Weather dependent: true

### Cultural Template

Default attributes for cultural experiences:
- Cultural Type: "Museum Visit"
- Language: "English, Spanish"
- Duration: "2 hours"
- Guided Tour: "Available"
- Educational Content: "Historical, Artistic"

Validation rules:
- Max guests: 1-25
- Advance booking: optional
- Booking notice: 0-7 days

## Input Data Structure

```typescript
interface MetadataGenerationInput {
  coupon_title: string;
  coupon_description: string;
  activity_type: ActivityType;
  business_info: BusinessInfo;
  discount_info: DiscountInfo;
  validity_period: ValidityPeriod;
  redemption_conditions: RedemptionConditions;
  region: string;
  project_reference: ProjectReference;
  image_url?: string;
  custom_attributes?: CouponAttribute[];
}
```

### Supporting Interfaces

```typescript
interface BusinessInfo {
  name: string;
  address: string;
  contact: {
    phone?: string;
    email?: string;
  };
}

interface DiscountInfo {
  percentage?: number;    // 1-100
  amount?: number;       // > 0
  currency?: string;     // 3-letter ISO code
}

interface ValidityPeriod {
  valid_from: Date;
  valid_until: Date;
  blackout_dates?: Date[];
}

interface RedemptionConditions {
  max_guests?: number;
  minimum_spend?: number;
  advance_booking_required?: boolean;
  booking_notice_days?: number;
  terms_and_conditions: string[];
}

interface ProjectReference {
  project_id: string;
  project_name: string;
  project_url?: string;
}
```

## Validation Rules

### Required Fields

All metadata must include:
- Non-empty name and description
- Valid image URL
- At least one attribute
- Valid business information with contact method
- Valid date range (future expiration)
- Either discount percentage (1-100) or positive amount
- Non-empty region and project reference
- At least one term and condition

### Field Limits

- Name: ≤ 100 characters (warning at 100+)
- Description: ≤ 500 characters (warning at 500+)
- Validity period: ≤ 2 years maximum
- Currency: 3-letter ISO code
- Email: valid email format
- URLs: valid URL format

### Date Validation

- `valid_from` must be a valid date
- `valid_until` must be after `valid_from`
- `valid_until` must be in the future
- Maximum validity period: 2 years

## Usage Examples

### Basic Hotel Coupon

```typescript
import { CouponMetadataService } from '@/services/coupon-metadata.service';
import { ActivityType } from '@/types/coupon-metadata';

const input = {
  coupon_title: "TreeByte Eco-Hotel Discount",
  coupon_description: "25% off your stay supporting reforestation",
  activity_type: ActivityType.HOTEL,
  business_info: {
    name: "Green Valley Resort",
    address: "123 Forest Lane, Costa Rica",
    contact: {
      phone: "+506 1234 5678",
      email: "info@greenvalley.cr"
    }
  },
  discount_info: {
    percentage: 25
  },
  validity_period: {
    valid_from: new Date('2024-01-01'),
    valid_until: new Date('2024-12-31')
  },
  redemption_conditions: {
    max_guests: 4,
    advance_booking_required: true,
    booking_notice_days: 7,
    terms_and_conditions: [
      "Valid for stays of 2 nights or more",
      "Cannot be combined with other offers"
    ]
  },
  region: "Costa Rica Central Valley",
  project_reference: {
    project_id: "proj_12345",
    project_name: "Costa Rica Reforestation Initiative"
  }
};

const metadata = CouponMetadataService.generateCouponMetadata(input);
```

### Restaurant Coupon with Amount Discount

```typescript
const restaurantInput = {
  coupon_title: "TreeByte Farm-to-Table Experience",
  coupon_description: "Enjoy sustainable cuisine with $30 off",
  activity_type: ActivityType.RESTAURANT,
  business_info: {
    name: "Sustainable Harvest Restaurant",
    address: "456 Organic Lane, San José",
    contact: { email: "info@sustainableharvest.cr" }
  },
  discount_info: {
    amount: 30,
    currency: "USD"
  },
  validity_period: {
    valid_from: new Date('2024-01-01'),
    valid_until: new Date('2024-12-31'),
    blackout_dates: [
      new Date('2024-12-25'), // Christmas
      new Date('2024-12-31')  // New Year's Eve
    ]
  },
  redemption_conditions: {
    max_guests: 6,
    minimum_spend: 100,
    terms_and_conditions: ["Minimum order $100"]
  },
  region: "San José, Costa Rica",
  project_reference: {
    project_id: "proj_67890",
    project_name: "Sustainable Agriculture Project"
  }
};
```

## API Methods

### CouponMetadataService

```typescript
// Generate metadata from input
static generateCouponMetadata(input: MetadataGenerationInput): CouponMetadata

// Validate metadata completeness
static validateMetadata(metadata: CouponMetadata): MetadataValidationResult

// Validate input data
static validateInput(input: MetadataGenerationInput): void

// Format date for metadata
static formatDateForMetadata(date: Date): string

// Sanitize text fields
static sanitizeTextFields(text: string): string

// Generate coupon image URL
static generateCouponImage(businessInfo, activityType): string
```

### CouponMetadataUtils

```typescript
// Comprehensive metadata validation
static validateMetadata(metadata: CouponMetadata): MetadataValidationResult

// Format dates for metadata
static formatDateForMetadata(date: Date): string

// Generate default coupon image URLs
static generateCouponImage(businessInfo, activityType): string

// Sanitize text for display
static sanitizeTextFields(text: string): string

// Sanitize text for URLs
static sanitizeForUrl(text: string): string

// Generate unique metadata IDs
static generateUniqueMetadataId(): string

// Extract required attributes from metadata
static extractRequiredAttributes(metadata: CouponMetadata): object

// Format activity type for display
static formatActivityTypeDisplay(activityType: ActivityType): string

// Validate date ranges
static validateDateRange(validFrom: Date, validUntil: Date): string[]

// Validate discount values
static validateDiscountValue(percentage?, amount?, currency?): string[]
```

## Error Handling

The system provides comprehensive error handling with descriptive messages:

### Validation Errors
- Missing required fields
- Invalid date ranges
- Invalid discount values
- Invalid contact information
- Invalid URLs

### Runtime Errors
- Invalid date objects
- Network connectivity issues
- IPFS upload failures

## Testing

Run the comprehensive test suite:

```bash
npm run test:coupon-metadata
```

Or execute the test file directly:

```bash
ts-node -r tsconfig-paths/register src/test/coupon-metadata.test.ts
```

The test suite covers:
- ✅ Metadata generation for all activity types
- ✅ Input validation with various error conditions
- ✅ Utility function correctness
- ✅ Complete workflow integration
- ✅ Edge cases and boundary conditions

## Integration Notes

### IPFS Storage
Generated metadata can be uploaded to IPFS using the existing `uploadToIPFS` service in `@/lib/ipfs/upload-to-ipfs.ts`.

### Database Storage
Metadata can be stored in the database alongside project information, with the IPFS hash referenced in the projects table.

### NFT Minting
The generated metadata follows ERC-721 and ERC-1155 standards and can be used directly for NFT minting on Stellar or other blockchains.

## Future Enhancements

- Multi-language support for descriptions and attributes
- Dynamic image generation based on activity type and region
- Integration with external tourism APIs for real-time pricing
- Advanced template customization per region or partner
- Metadata versioning for coupon updates