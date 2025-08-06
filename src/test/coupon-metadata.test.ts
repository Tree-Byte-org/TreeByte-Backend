import { CouponMetadataService } from "@/services/coupon-metadata.service";
import { CouponMetadataUtils } from "@/utils/coupon-metadata-utils";
import { ActivityType, MetadataGenerationInput } from "@/types/coupon-metadata";

console.log("🧪 Starting Coupon Metadata Tests");

const createValidInput = (overrides: Partial<MetadataGenerationInput> = {}): MetadataGenerationInput => ({
  coupon_title: "TreeByte Eco-Hotel Discount",
  coupon_description: "Enjoy 25% off your stay at our eco-friendly partner hotel supporting local reforestation projects.",
  activity_type: ActivityType.HOTEL,
  business_info: {
    name: "Green Valley Eco Resort",
    address: "123 Forest Lane, Costa Rica",
    contact: {
      phone: "+506 1234 5678",
      email: "reservations@greenvalley.cr"
    }
  },
  discount_info: {
    percentage: 25,
    currency: "USD"
  },
  validity_period: {
    valid_from: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    blackout_dates: [
      new Date('2024-12-25'),
      new Date('2024-12-31')
    ]
  },
  redemption_conditions: {
    max_guests: 4,
    minimum_spend: 200,
    advance_booking_required: true,
    booking_notice_days: 7,
    terms_and_conditions: [
      "Valid for stays of 2 nights or more",
      "Cannot be combined with other offers",
      "Subject to availability"
    ]
  },
  region: "Costa Rica Central Valley",
  project_reference: {
    project_id: "proj_12345",
    project_name: "Costa Rica Reforestation Initiative",
    project_url: "https://treebyte.eco/projects/costa-rica-reforestation"
  },
  image_url: "https://example.com/green-valley-resort.jpg",
  ...overrides
});

async function testMetadataGeneration() {
  console.log("\n📝 Testing metadata generation...");
  
  try {
    const input = createValidInput();
    const metadata = CouponMetadataService.generateCouponMetadata(input);
    
    console.log("✅ Metadata generated successfully");
    console.log("- Name:", metadata.name);
    console.log("- Description length:", metadata.description.length);
    console.log("- Attributes count:", metadata.attributes.length);
    console.log("- Image URL:", metadata.image);
    console.log("- External URL:", metadata.external_url);
    
    // Validate the generated metadata
    const validationResult = CouponMetadataService.validateMetadata(metadata);
    
    if (validationResult.isValid) {
      console.log("✅ Generated metadata is valid");
    } else {
      console.log("❌ Generated metadata has errors:", validationResult.errors);
    }
    
    if (validationResult.warnings.length > 0) {
      console.log("⚠️  Metadata warnings:", validationResult.warnings);
    }
    
    return true;
    
  } catch (error) {
    console.error("❌ Metadata generation failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

async function testDifferentActivityTypes() {
  console.log("\n🏨 Testing different activity types...");
  
  const activityTypes = Object.values(ActivityType);
  let passedTests = 0;
  
  for (const activityType of activityTypes) {
    try {
      const input = createValidInput({
        activity_type: activityType,
        coupon_title: `TreeByte ${activityType.charAt(0).toUpperCase() + activityType.slice(1)} Experience`,
        business_info: {
          name: `Test ${activityType} Business`,
          address: "Test Address",
          contact: { email: "test@example.com" }
        }
      });
      
      const metadata = CouponMetadataService.generateCouponMetadata(input);
      const validation = CouponMetadataService.validateMetadata(metadata);
      
      if (validation.isValid) {
        console.log(`✅ ${activityType} metadata generated successfully`);
        passedTests++;
      } else {
        console.log(`❌ ${activityType} metadata invalid:`, validation.errors);
      }
      
    } catch (error) {
      console.error(`❌ ${activityType} test failed:`, error instanceof Error ? error.message : error);
    }
  }
  
  console.log(`📊 Activity type tests: ${passedTests}/${activityTypes.length} passed`);
  return passedTests === activityTypes.length;
}

async function testValidationFailures() {
  console.log("\n❌ Testing validation failures...");
  
  const testCases = [
    {
      name: "Missing coupon title",
      input: createValidInput({ coupon_title: "" }),
      expectError: true
    },
    {
      name: "Missing business name",
      input: createValidInput({ 
        business_info: { 
          name: "", 
          address: "Test Address", 
          contact: { email: "test@example.com" } 
        } 
      }),
      expectError: true
    },
    {
      name: "Invalid date range",
      input: createValidInput({
        validity_period: {
          valid_from: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        }
      }),
      expectError: true
    },
    {
      name: "Invalid discount percentage",
      input: createValidInput({
        discount_info: {
          percentage: 150 // Invalid percentage > 100
        }
      }),
      expectError: true
    },
    {
      name: "No discount provided",
      input: createValidInput({
        discount_info: {}
      }),
      expectError: true
    }
  ];
  
  let passedTests = 0;
  
  for (const testCase of testCases) {
    try {
      CouponMetadataService.generateCouponMetadata(testCase.input);
      
      if (testCase.expectError) {
        console.log(`❌ ${testCase.name}: Expected error but none occurred`);
      } else {
        console.log(`✅ ${testCase.name}: Success as expected`);
        passedTests++;
      }
      
    } catch (error) {
      if (testCase.expectError) {
        console.log(`✅ ${testCase.name}: Error caught as expected`);
        passedTests++;
      } else {
        console.log(`❌ ${testCase.name}: Unexpected error:`, error instanceof Error ? error.message : error);
      }
    }
  }
  
  console.log(`📊 Validation tests: ${passedTests}/${testCases.length} passed`);
  return passedTests === testCases.length;
}

async function testUtilityFunctions() {
  console.log("\n🔧 Testing utility functions...");
  
  let passedTests = 0;
  const totalTests = 6;
  
  // Test date formatting
  try {
    const testDate = new Date('2024-12-31');
    const formatted = CouponMetadataUtils.formatDateForMetadata(testDate);
    
    if (formatted === '2024-12-31') {
      console.log("✅ Date formatting test passed");
      passedTests++;
    } else {
      console.log("❌ Date formatting test failed. Expected '2024-12-31', got:", formatted);
    }
  } catch (error) {
    console.error("❌ Date formatting test error:", error instanceof Error ? error.message : error);
  }
  
  // Test text sanitization
  try {
    const dirtyText = "  <script>alert('test')</script>  Test & Company  ";
    const sanitized = CouponMetadataUtils.sanitizeTextFields(dirtyText);
    
    if (sanitized === "scriptalert('test')/script Test  Company") {
      console.log("✅ Text sanitization test passed");
      passedTests++;
    } else {
      console.log("❌ Text sanitization test failed. Got:", sanitized);
    }
  } catch (error) {
    console.error("❌ Text sanitization test error:", error instanceof Error ? error.message : error);
  }
  
  // Test URL sanitization
  try {
    const businessName = "Green Valley Eco-Resort & Spa!";
    const sanitized = CouponMetadataUtils.sanitizeForUrl(businessName);
    
    if (sanitized === "green-valley-eco-resort-spa") {
      console.log("✅ URL sanitization test passed");
      passedTests++;
    } else {
      console.log("❌ URL sanitization test failed. Got:", sanitized);
    }
  } catch (error) {
    console.error("❌ URL sanitization test error:", error instanceof Error ? error.message : error);
  }
  
  // Test image generation
  try {
    const businessInfo = { name: "Test Resort" };
    const imageUrl = CouponMetadataUtils.generateCouponImage(businessInfo, ActivityType.HOTEL);
    
    if (imageUrl.includes("hotel") && imageUrl.includes("test-resort")) {
      console.log("✅ Image generation test passed");
      passedTests++;
    } else {
      console.log("❌ Image generation test failed. Got:", imageUrl);
    }
  } catch (error) {
    console.error("❌ Image generation test error:", error instanceof Error ? error.message : error);
  }
  
  // Test date range validation
  try {
    const validFrom = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    const errors = CouponMetadataUtils.validateDateRange(validFrom, validUntil);
    
    if (errors.length === 0) {
      console.log("✅ Date range validation test passed");
      passedTests++;
    } else {
      console.log("❌ Date range validation test failed. Errors:", errors);
    }
  } catch (error) {
    console.error("❌ Date range validation test error:", error instanceof Error ? error.message : error);
  }
  
  // Test discount validation
  try {
    const errors = CouponMetadataUtils.validateDiscountValue(25, undefined, undefined);
    
    if (errors.length === 0) {
      console.log("✅ Discount validation test passed");
      passedTests++;
    } else {
      console.log("❌ Discount validation test failed. Errors:", errors);
    }
  } catch (error) {
    console.error("❌ Discount validation test error:", error instanceof Error ? error.message : error);
  }
  
  console.log(`📊 Utility function tests: ${passedTests}/${totalTests} passed`);
  return passedTests === totalTests;
}

async function testCompleteWorkflow() {
  console.log("\n🔄 Testing complete workflow...");
  
  try {
    // Create input
    const input = createValidInput({
      activity_type: ActivityType.RESTAURANT,
      coupon_title: "TreeByte Farm-to-Table Experience",
      business_info: {
        name: "Sustainable Harvest Restaurant",
        address: "456 Organic Lane, San José, Costa Rica",
        contact: {
          phone: "+506 8765 4321",
          email: "info@sustainableharvest.cr"
        }
      },
      discount_info: {
        percentage: 20
      }
    });
    
    console.log("1. ✅ Created valid input");
    
    // Generate metadata
    const metadata = CouponMetadataService.generateCouponMetadata(input);
    console.log("2. ✅ Generated metadata");
    
    // Validate metadata
    const validation = CouponMetadataService.validateMetadata(metadata);
    console.log("3. ✅ Validated metadata");
    
    // Extract required attributes
    const requiredAttrs = CouponMetadataUtils.extractRequiredAttributes(metadata);
    console.log("4. ✅ Extracted required attributes");
    
    if (validation.isValid && Object.keys(requiredAttrs).length >= 7) {
      console.log("✅ Complete workflow test passed");
      console.log("📄 Final metadata summary:");
      console.log("- Activity:", requiredAttrs.activity_type);
      console.log("- Business:", requiredAttrs.business_name);
      console.log("- Region:", requiredAttrs.region);
      console.log("- Valid until:", requiredAttrs.valid_until);
      return true;
    } else {
      console.log("❌ Complete workflow test failed");
      console.log("- Validation errors:", validation.errors);
      return false;
    }
    
  } catch (error) {
    console.error("❌ Complete workflow test error:", error instanceof Error ? error.message : error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Running Coupon Metadata Test Suite\n");
  
  const testResults = [];
  
  testResults.push(await testMetadataGeneration());
  testResults.push(await testDifferentActivityTypes());
  testResults.push(await testValidationFailures());
  testResults.push(await testUtilityFunctions());
  testResults.push(await testCompleteWorkflow());
  
  const passedCount = testResults.filter(result => result).length;
  const totalTests = testResults.length;
  
  console.log(`\n📊 Test Results: ${passedCount}/${totalTests} test suites passed`);
  
  if (passedCount === totalTests) {
    console.log("🎉 All tests passed! Coupon metadata system is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Please review the errors above.");
  }
  
  return passedCount === totalTests;
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error("❌ Test execution failed:", error);
      process.exit(1);
    });
}

export { runAllTests };