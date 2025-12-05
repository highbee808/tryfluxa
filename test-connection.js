/**
 * Test script to verify all Supabase Edge Functions connectivity and CORS
 * Run with: node test-connection.js
 */

// Use dynamic import for node-fetch (works in Node.js)
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

// Get base URL from environment
const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

if (!base) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_URL environment variable');
  console.error('   Set it in your .env file or pass it as an environment variable');
  process.exit(1);
}

// Remove trailing slash if present
const cleanBase = base.replace(/\/$/, '');
const functionsBase = `${cleanBase}/functions/v1`;

// List of critical functions to test
const endpoints = [
  "fetch-content",
  "fetch-news", 
  "fetch-music",
  "fetch-sports",
  "publish-gist",
  "spotify-oauth-login",
  "generate-gist",
  "text-to-speech",
  "fluxa-chat",
  "fetch-feed"
];

async function testEndpoint(endpoint) {
  const url = `${functionsBase}/${endpoint}`;
  
  try {
    // Test OPTIONS preflight first
    console.log(`\n🔍 Testing ${endpoint}...`);
    
    // Test OPTIONS request
    const optionsRes = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization, apikey'
      }
    });
    
    if (optionsRes.status === 200 || optionsRes.status === 204) {
      console.log(`  ✅ OPTIONS preflight: ${optionsRes.status}`);
      
      // Check CORS headers
      const corsOrigin = optionsRes.headers.get('Access-Control-Allow-Origin');
      const corsMethods = optionsRes.headers.get('Access-Control-Allow-Methods');
      const corsHeaders = optionsRes.headers.get('Access-Control-Allow-Headers');
      
      if (corsOrigin === '*' || corsOrigin) {
        console.log(`  ✅ CORS Origin: ${corsOrigin}`);
      } else {
        console.log(`  ⚠️  CORS Origin header missing`);
      }
      
      if (corsMethods) {
        console.log(`  ✅ CORS Methods: ${corsMethods}`);
      } else {
        console.log(`  ⚠️  CORS Methods header missing`);
      }
      
      if (corsHeaders) {
        console.log(`  ✅ CORS Headers: ${corsHeaders}`);
      } else {
        console.log(`  ⚠️  CORS Headers header missing`);
      }
    } else {
      console.log(`  ❌ OPTIONS preflight failed: ${optionsRes.status}`);
    }
    
    // Test GET/POST (will likely fail without auth, but checks if function exists)
    try {
      const testRes = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // 401/403 is expected without auth, 404 means function doesn't exist
      if (testRes.status === 404) {
        console.log(`  ⚠️  Function may not exist (404)`);
      } else if (testRes.status === 401 || testRes.status === 403) {
        console.log(`  ✅ Function exists (${testRes.status} - auth required, expected)`);
      } else {
        console.log(`  ✅ Function accessible: ${testRes.status}`);
      }
    } catch (testErr) {
      console.log(`  ⚠️  Function test failed: ${testErr.message}`);
    }
    
    return {
      endpoint,
      url,
      optionsStatus: optionsRes.status,
      hasCors: !!corsOrigin
    };
  } catch (e) {
    console.error(`  ❌ Error testing ${endpoint}:`, e.message);
    return {
      endpoint,
      url,
      error: e.message
    };
  }
}

async function testAll() {
  console.log('🚀 Starting Edge Function Connectivity Tests\n');
  console.log(`📍 Base URL: ${cleanBase}`);
  console.log(`📍 Functions URL: ${functionsBase}\n`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.optionsStatus === 200 || r.optionsStatus === 204);
  const withCors = results.filter(r => r.hasCors);
  const errors = results.filter(r => r.error);
  
  console.log(`\n✅ Successful OPTIONS: ${successful.length}/${endpoints.length}`);
  console.log(`✅ With CORS headers: ${withCors.length}/${endpoints.length}`);
  console.log(`❌ Errors: ${errors.length}/${endpoints.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Failed endpoints:');
    errors.forEach(r => {
      console.log(`   - ${r.endpoint}: ${r.error}`);
    });
  }
  
  console.log('\n✅ Test complete!');
  
  // Exit with error code if there are failures
  if (errors.length > 0 || successful.length < endpoints.length) {
    process.exit(1);
  }
}

// Run tests
testAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
