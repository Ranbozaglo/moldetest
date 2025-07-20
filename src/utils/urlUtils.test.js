/**
 * Test cases for URL utility functions
 * Run these tests to verify the URL parameter extraction works correctly
 */

// Test the getUrlParam function
const testGetUrlParam = () => {
  console.log("🧪 Testing getUrlParam function...");
  
  // Test case 1: Exact match
  const test1 = getUrlParam("?inspectionId=13", "inspectionId");
  console.log("Test 1 - Exact match:", test1 === "13" ? "✅ PASS" : "❌ FAIL");
  
  // Test case 2: Case insensitive match
  const test2 = getUrlParam("?inspectionid=13", "inspectionId");
  console.log("Test 2 - Case insensitive:", test2 === "13" ? "✅ PASS" : "❌ FAIL");
  
  // Test case 3: Different case
  const test3 = getUrlParam("?InspectionId=13", "inspectionid");
  console.log("Test 3 - Different case:", test3 === "13" ? "✅ PASS" : "❌ FAIL");
  
  // Test case 4: No match
  const test4 = getUrlParam("?other=value", "inspectionId");
  console.log("Test 4 - No match:", test4 === null ? "✅ PASS" : "❌ FAIL");
  
  // Test case 5: Empty search
  const test5 = getUrlParam("", "inspectionId");
  console.log("Test 5 - Empty search:", test5 === null ? "✅ PASS" : "❌ FAIL");
};

// Test the getInspectionIdFromUrl function
const testGetInspectionIdFromUrl = () => {
  console.log("🧪 Testing getInspectionIdFromUrl function...");
  
  // Test case 1: inspectionId
  const test1 = getInspectionIdFromUrl("?inspectionId=13");
  console.log("Test 1 - inspectionId:", test1 === "13" ? "✅ PASS" : "❌ FAIL");
  
  // Test case 2: inspectionid
  const test2 = getInspectionIdFromUrl("?inspectionid=13");
  console.log("Test 2 - inspectionid:", test2 === "13" ? "✅ PASS" : "❌ FAIL");
  
  // Test case 3: id
  const test3 = getInspectionIdFromUrl("?id=13");
  console.log("Test 3 - id:", test3 === "13" ? "✅ PASS" : "❌ FAIL");
  
  // Test case 4: inspection_id
  const test4 = getInspectionIdFromUrl("?inspection_id=13");
  console.log("Test 4 - inspection_id:", test4 === "13" ? "✅ PASS" : "❌ FAIL");
  
  // Test case 5: No match
  const test5 = getInspectionIdFromUrl("?other=value");
  console.log("Test 5 - No match:", test5 === null ? "✅ PASS" : "❌ FAIL");
  
  // Test case 6: Multiple parameters
  const test6 = getInspectionIdFromUrl("?other=value&inspectionid=13&more=stuff");
  console.log("Test 6 - Multiple params:", test6 === "13" ? "✅ PASS" : "❌ FAIL");
};

// Test the createPageUrl function (if available)
const testCreatePageUrl = () => {
  console.log("🧪 Testing createPageUrl function...");
  
  try {
    // Test case 1: Basic page URL
    const test1 = createPageUrl('InspectionDetails');
    console.log("Test 1 - Basic URL:", test1 === "/inspectiondetails" ? "✅ PASS" : "❌ FAIL");
    
    // Test case 2: URL with single parameter
    const test2 = createPageUrl('InspectionDetails', { id: '13' });
    console.log("Test 2 - Single param:", test2 === "/inspectiondetails?id=13" ? "✅ PASS" : "❌ FAIL");
    
    // Test case 3: URL with multiple parameters
    const test3 = createPageUrl('InspectionDetails', { id: '13', edit: 'true' });
    console.log("Test 3 - Multiple params:", test3 === "/inspectiondetails?id=13&edit=true" ? "✅ PASS" : "❌ FAIL");
    
    // Test case 4: URL with null/undefined parameters
    const test4 = createPageUrl('InspectionDetails', { id: '13', edit: null, other: undefined });
    console.log("Test 4 - Null params:", test4 === "/inspectiondetails?id=13" ? "✅ PASS" : "❌ FAIL");
    
  } catch (error) {
    console.log("❌ createPageUrl function not available or has errors:", error.message);
  }
};

// Run all tests
const runUrlTests = () => {
  console.log("🚀 Running URL utility tests...");
  testGetUrlParam();
  testGetInspectionIdFromUrl();
  testCreatePageUrl();
  console.log("✅ All tests completed!");
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runUrlTests = runUrlTests;
}

export { runUrlTests }; 