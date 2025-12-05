// Quick function test script
// Run this in browser console (F12)

(async () => {
  console.log('🔍 Testing publish-gist function...\n');
  
  // Check environment
  const url = import.meta.env.VITE_SUPABASE_URL;
  console.log('Supabase URL:', url);
  console.log('Expected function URL:', url + '/functions/v1/publish-gist');
  console.log('');
  
  // Test function
  console.log('Calling function...');
  const { data, error } = await supabase.functions.invoke('publish-gist', {
    body: {
      topic: 'Quick test topic'
    }
  });
  
  if (error) {
    console.error('❌ ERROR:', error);
    console.error('   Name:', error.name);
    console.error('   Message:', error.message);
    console.error('   Context:', error.context);
    
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.error('\n⚠️  Function not deployed!');
      console.error('   → Run: supabase functions deploy publish-gist');
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('\n⚠️  Authentication issue!');
      console.error('   → Check if you are logged in');
      console.error('   → Check function secrets are set');
    } else if (error.message.includes('500') || error.message.includes('Internal')) {
      console.error('\n⚠️  Function error!');
      console.error('   → Check function logs in Supabase Dashboard');
      console.error('   → Check if secrets are set correctly');
    }
  } else {
    console.log('✅ SUCCESS!');
    console.log('   Data:', data);
  }
})();

