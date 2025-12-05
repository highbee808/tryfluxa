// Check which functions are deployed
// Run this in browser console (F12)

(async () => {
  console.log('🔍 Checking Deployed Functions...\n');
  
  const functions = ['publish-gist', 'generate-gist', 'text-to-speech'];
  const results = {};
  
  for (const func of functions) {
    try {
      // Try to invoke with minimal payload
      const { error } = await supabase.functions.invoke(func, {
        body: { topic: 'test' }
      });
      
      // If we get an error but it's not "function not found", the function exists
      if (error) {
        if (error.message?.includes('not found') || error.message?.includes('404')) {
          results[func] = { deployed: false, error: 'Not found' };
        } else {
          results[func] = { deployed: true, error: error.message };
        }
      } else {
        results[func] = { deployed: true, error: null };
      }
    } catch (err) {
      results[func] = { deployed: false, error: err.message };
    }
  }
  
  console.log('📋 Deployment Status:');
  Object.entries(results).forEach(([name, result]) => {
    if (result.deployed) {
      console.log(`   ✅ ${name}: Deployed`);
    } else {
      console.log(`   ❌ ${name}: NOT DEPLOYED - ${result.error}`);
    }
  });
  
  console.log('\n');
  const missing = Object.entries(results).filter(([_, r]) => !r.deployed);
  if (missing.length > 0) {
    console.log('⚠️  Missing functions:', missing.map(([name]) => name).join(', '));
    console.log('   → Deploy these via Dashboard: Edge Functions → Create function');
  } else {
    console.log('✅ All functions are deployed!');
    console.log('   → If still getting errors, check function logs in Dashboard');
  }
})();

