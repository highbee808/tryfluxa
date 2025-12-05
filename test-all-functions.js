// Complete function diagnostic script
// Run this in browser console (F12)

(async () => {
  console.log('🔍 COMPREHENSIVE FUNCTION DIAGNOSTIC\n');
  
  // Test 1: Check if functions are accessible
  console.log('1️⃣ Testing function accessibility...\n');
  
  const functions = ['publish-gist', 'generate-gist', 'text-to-speech'];
  const results = {};
  
  for (const funcName of functions) {
    try {
      const { error } = await supabase.functions.invoke(funcName, {
        body: { topic: 'test' }
      });
      
      if (error) {
        results[funcName] = {
          exists: true,
          error: error.message || error.name,
          fullError: error
        };
        console.log(`   ${funcName}: ❌ Error - ${error.message || error.name}`);
      } else {
        results[funcName] = { exists: true, error: null };
        console.log(`   ${funcName}: ✅ Accessible`);
      }
    } catch (err) {
      results[funcName] = {
        exists: false,
        error: err.message
      };
      console.log(`   ${funcName}: ❌ Not found or network error`);
    }
  }
  
  console.log('\n2️⃣ Testing publish-gist with full request...\n');
  
  try {
    const { data, error } = await supabase.functions.invoke('publish-gist', {
      body: {
        topic: 'Quick test topic',
        topicCategory: 'Tech'
      }
    });
    
    if (error) {
      console.error('❌ ERROR:', error);
      console.error('   Name:', error.name);
      console.error('   Message:', error.message);
      console.error('   Context:', error.context);
      console.error('   Full error:', JSON.stringify(error, null, 2));
      
      // Provide specific guidance
      if (error.name === 'FunctionsFetchError') {
        console.error('\n⚠️  FunctionsFetchError means:');
        console.error('   → Function not deployed');
        console.error('   → Function name is wrong');
        console.error('   → Network/CORS issue');
        console.error('\n   Fix: Deploy the function via CLI or Dashboard');
      }
    } else {
      console.log('✅ SUCCESS!');
      console.log('   Data:', data);
    }
  } catch (err) {
    console.error('❌ EXCEPTION:', err);
  }
  
  console.log('\n3️⃣ Summary:\n');
  console.log('Functions status:');
  Object.entries(results).forEach(([name, result]) => {
    console.log(`   ${name}: ${result.exists ? (result.error ? '⚠️ Has errors' : '✅ OK') : '❌ Not found'}`);
  });
  
  console.log('\n✅ Diagnostic complete!');
  console.log('\nNext steps:');
  console.log('1. If functions not found → Deploy them');
  console.log('2. If errors → Check function logs in Supabase Dashboard');
  console.log('3. Share the error output above for specific fixes');
})();

