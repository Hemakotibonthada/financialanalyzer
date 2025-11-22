/**
 * User Data Isolation Test Script
 * 
 * This script helps verify that user data is properly isolated
 * Run this in the browser console after logging in with different users
 */

console.log('🔒 User Data Isolation Test Suite');
console.log('=====================================\n');

/**
 * Test 1: Check Current Cache Keys
 */
function testCacheKeys() {
  console.log('📋 Test 1: Checking cache keys...');
  
  const sessionKeys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('dashboard') || key.includes('cache') || key.includes('report'))) {
      sessionKeys.push(key);
    }
  }
  
  const localKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('dashboard') || key.includes('cache') || key.includes('report'))) {
      localKeys.push(key);
    }
  }
  
  console.log('Session Storage Cache Keys:', sessionKeys);
  console.log('Local Storage Cache Keys:', localKeys);
  
  // Check if keys contain user identifier
  const lastUserKey = sessionStorage.getItem('last_user_key');
  console.log('Last User Key:', lastUserKey);
  
  const hasUserSpecificKeys = sessionKeys.some(key => 
    key.includes('@') || key.includes('_') && key !== 'dashboard_data'
  );
  
  if (hasUserSpecificKeys || sessionKeys.length === 0) {
    console.log('✅ PASS: Cache keys are user-specific or empty');
  } else {
    console.log('❌ FAIL: Cache keys are not user-specific!');
  }
  
  console.log('');
}

/**
 * Test 2: Check Current User
 */
function testCurrentUser() {
  console.log('👤 Test 2: Checking current user...');
  
  const userFromSession = sessionStorage.getItem('user');
  const userFromLocal = localStorage.getItem('user');
  
  let currentUser = null;
  try {
    currentUser = userFromSession ? JSON.parse(userFromSession) : 
                   userFromLocal ? JSON.parse(userFromLocal) : null;
  } catch (e) {
    console.log('❌ FAIL: Cannot parse user data');
    return;
  }
  
  if (currentUser) {
    console.log('Current User:', {
      email: currentUser.email,
      id: currentUser.id,
      name: currentUser.name
    });
    console.log('✅ PASS: User data found');
  } else {
    console.log('⚠️  WARNING: No user data found (not logged in?)');
  }
  
  console.log('');
}

/**
 * Test 3: Verify Cache Contains Correct User ID
 */
function testCacheContent() {
  console.log('🔍 Test 3: Verifying cache content...');
  
  const currentUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null');
  if (!currentUser) {
    console.log('⚠️  SKIP: Not logged in');
    return;
  }
  
  const userKey = currentUser.id || currentUser.email;
  const dashboardCache = sessionStorage.getItem(`dashboard_data_${userKey}`);
  
  if (dashboardCache) {
    try {
      const cacheData = JSON.parse(dashboardCache);
      console.log('Dashboard Cache Found for:', userKey);
      console.log('Cache Summary:', {
        hasProfile: !!cacheData.profile,
        hasSummary: !!cacheData.summary,
        hasCharts: !!cacheData.charts,
        totalAnalyses: cacheData.summary?.totalAnalyses || 0
      });
      console.log('✅ PASS: Cache is user-specific');
    } catch (e) {
      console.log('❌ FAIL: Cannot parse cache data');
    }
  } else {
    console.log('ℹ️  INFO: No cached dashboard data (will fetch from server)');
  }
  
  console.log('');
}

/**
 * Test 4: Check for Orphaned Cache
 */
function testOrphanedCache() {
  console.log('🗑️  Test 4: Checking for orphaned cache...');
  
  const currentUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null');
  if (!currentUser) {
    console.log('⚠️  SKIP: Not logged in');
    return;
  }
  
  const currentUserKey = currentUser.id || currentUser.email;
  const orphanedKeys = [];
  
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.includes('dashboard_data_') && !key.includes(currentUserKey)) {
      orphanedKeys.push(key);
    }
  }
  
  if (orphanedKeys.length > 0) {
    console.log('⚠️  WARNING: Found orphaned cache from other users!');
    console.log('Orphaned Keys:', orphanedKeys);
    console.log('Recommendation: Clear browser cache or log out/in again');
  } else {
    console.log('✅ PASS: No orphaned cache found');
  }
  
  console.log('');
}

/**
 * Test 5: Security Check
 */
function testSecurity() {
  console.log('🔐 Test 5: Security check...');
  
  const issues = [];
  
  // Check for generic cache keys
  const genericKeys = ['dashboard_data', 'dashboard_cache_time', 'cache_data'];
  for (const key of genericKeys) {
    if (sessionStorage.getItem(key) || localStorage.getItem(key)) {
      issues.push(`Found insecure generic cache key: ${key}`);
    }
  }
  
  // Check if token exists
  const hasToken = !!(localStorage.getItem('token') || sessionStorage.getItem('token'));
  if (!hasToken) {
    issues.push('No authentication token found');
  }
  
  // Check last_user_key consistency
  const lastUserKey = sessionStorage.getItem('last_user_key');
  const currentUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null');
  if (currentUser && lastUserKey) {
    const currentUserKey = currentUser.id || currentUser.email;
    if (lastUserKey !== currentUserKey) {
      issues.push(`User mismatch: last_user_key=${lastUserKey} but current user=${currentUserKey}`);
    }
  }
  
  if (issues.length > 0) {
    console.log('❌ SECURITY ISSUES FOUND:');
    issues.forEach(issue => console.log('  -', issue));
  } else {
    console.log('✅ PASS: No security issues detected');
  }
  
  console.log('');
}

/**
 * Test 6: Simulate User Switch Detection
 */
function testUserSwitchDetection() {
  console.log('🔄 Test 6: Testing user switch detection...');
  
  const lastUserKey = sessionStorage.getItem('last_user_key');
  const currentUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null');
  
  if (!currentUser) {
    console.log('⚠️  SKIP: Not logged in');
    return;
  }
  
  const currentUserKey = currentUser.id || currentUser.email;
  
  console.log('Last User Key:', lastUserKey);
  console.log('Current User Key:', currentUserKey);
  
  if (lastUserKey && lastUserKey !== currentUserKey) {
    console.log('⚠️  WARNING: User switch detected but cache may not have been cleared!');
    console.log('Recommendation: Log out and log back in');
  } else if (lastUserKey === currentUserKey) {
    console.log('✅ PASS: Same user, no switch detected');
  } else {
    console.log('ℹ️  INFO: First session (no previous user)');
  }
  
  console.log('');
}

/**
 * Utility: Clear All Caches (Manual)
 */
function clearAllCaches() {
  console.log('🧹 Clearing all caches...');
  
  let cleared = 0;
  
  // Clear sessionStorage
  const sessionKeys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('dashboard') || key.includes('cache') || key.includes('report'))) {
      sessionKeys.push(key);
    }
  }
  sessionKeys.forEach(key => {
    sessionStorage.removeItem(key);
    cleared++;
  });
  
  // Clear localStorage
  const localKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('dashboard') || key.includes('cache') || key.includes('report'))) {
      localKeys.push(key);
    }
  }
  localKeys.forEach(key => {
    localStorage.removeItem(key);
    cleared++;
  });
  
  console.log(`✅ Cleared ${cleared} cache entries`);
  console.log('Refresh the page to fetch fresh data');
}

/**
 * Run All Tests
 */
function runAllTests() {
  console.log('🚀 Running all tests...\n');
  
  testCacheKeys();
  testCurrentUser();
  testCacheContent();
  testOrphanedCache();
  testSecurity();
  testUserSwitchDetection();
  
  console.log('=====================================');
  console.log('✅ Test suite completed');
  console.log('\nUtility Functions Available:');
  console.log('  - runAllTests() : Run all tests again');
  console.log('  - clearAllCaches() : Manually clear all cached data');
  console.log('  - testSecurity() : Run security checks only');
}

// Auto-run tests when script is loaded
runAllTests();

// Make functions available globally
window.testUserIsolation = {
  runAllTests,
  testCacheKeys,
  testCurrentUser,
  testCacheContent,
  testOrphanedCache,
  testSecurity,
  testUserSwitchDetection,
  clearAllCaches
};

console.log('\n💡 TIP: Run testUserIsolation.runAllTests() to test again');
