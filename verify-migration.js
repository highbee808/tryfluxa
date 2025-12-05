/**
 * Fluxa Migration Verification Script
 * Run this after completing the migration steps
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔍 Fluxa Migration Verification\n');
console.log('Project URL:', SUPABASE_URL);
console.log('');

// Required tables to verify
const REQUIRED_TABLES = [
  'gists',
  'post_analytics',
  'raw_trends',
  'user_favorites',
  'user_subniches',
  'fluxa_memory',
  'fan_entities',
  'fan_follows'
];

// Required storage buckets
const REQUIRED_BUCKETS = [
  'gist-audio',
  'fluxa-reactions'
];

// Required functions to test
const REQUIRED_FUNCTIONS = [
  'generate-gist',
  'publish-gist',
  'text-to-speech'
];

async function verifyTables() {
  console.log('📊 Verifying Database Tables...');
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const results = {};
  for (const table of REQUIRED_TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        results[table] = { status: '❌', error: error.message };
      } else {
        results[table] = { status: '✅', count: data?.length || 0 };
      }
    } catch (err) {
      results[table] = { status: '❌', error: err.message };
    }
  }
  
  return results;
}

async function verifyStorageBuckets() {
  console.log('🗂️  Verifying Storage Buckets...');
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const results = {};
  for (const bucket of REQUIRED_BUCKETS) {
    try {
      const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1 });
      if (error) {
        results[bucket] = { status: '❌', error: error.message };
      } else {
        results[bucket] = { status: '✅' };
      }
    } catch (err) {
      results[bucket] = { status: '❌', error: err.message };
    }
  }
  
  return results;
}

async function verifyFunctions() {
  console.log('⚡ Verifying Edge Functions...');
  const results = {};
  
  for (const func of REQUIRED_FUNCTIONS) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${func}`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });
      
      if (response.ok || response.status === 405) {
        results[func] = { status: '✅' };
      } else {
        results[func] = { status: '❌', error: `HTTP ${response.status}` };
      }
    } catch (err) {
      results[func] = { status: '❌', error: err.message };
    }
  }
  
  return results;
}

async function testGenerateGist() {
  console.log('🧪 Testing generate-gist function...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-gist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: 'Test topic for Fluxa auto-generation'
      })
    });
    
    const data = await response.json();
    if (response.ok && data.headline && data.context) {
      return { status: '✅', data: { headline: data.headline.substring(0, 50) + '...' } };
    } else {
      return { status: '❌', error: data.error || 'Invalid response' };
    }
  } catch (err) {
    return { status: '❌', error: err.message };
  }
}

async function main() {
  console.log('Starting verification...\n');
  
  const tableResults = await verifyTables();
  console.log('\nTable Verification Results:');
  Object.entries(tableResults).forEach(([table, result]) => {
    console.log(`  ${result.status} ${table}`);
    if (result.error) console.log(`    Error: ${result.error}`);
  });
  
  const bucketResults = await verifyStorageBuckets();
  console.log('\nStorage Bucket Verification Results:');
  Object.entries(bucketResults).forEach(([bucket, result]) => {
    console.log(`  ${result.status} ${bucket}`);
    if (result.error) console.log(`    Error: ${result.error}`);
  });
  
  const functionResults = await verifyFunctions();
  console.log('\nEdge Function Verification Results:');
  Object.entries(functionResults).forEach(([func, result]) => {
    console.log(`  ${result.status} ${func}`);
    if (result.error) console.log(`    Error: ${result.error}`);
  });
  
  const testResult = await testGenerateGist();
  console.log('\nFunction Test Results:');
  console.log(`  ${testResult.status} generate-gist`);
  if (testResult.error) {
    console.log(`    Error: ${testResult.error}`);
  } else if (testResult.data) {
    console.log(`    Sample: ${testResult.data.headline}`);
  }
  
  console.log('\n✅ Verification complete!');
  console.log('\n📝 Next steps:');
  console.log('  1. Review any ❌ errors above');
  console.log('  2. Complete remaining migration steps from MIGRATION_GUIDE.md');
  console.log('  3. Set environment variables in Supabase Dashboard');
  console.log('  4. Configure CRON jobs');
  console.log('  5. Run end-to-end tests');
}

main().catch(console.error);

