// Quick connection test script
// Run this in browser console on any page

(async () => {
  console.log('🔍 Testing Supabase Connection...\n');
  
  // Check environment variables
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  console.log('📋 Environment Variables:');
  console.log('  URL:', url);
  console.log('  Key:', key ? key.substring(0, 30) + '...' : 'MISSING');
  console.log('  Has old URL?', url?.includes('zikzuwomznlpgvrftcpf') ? '❌ YES' : '✅ NO');
  console.log('');
  
  // Test connection
  console.log('🔌 Testing Database Connection...');
  try {
    const { data, error } = await supabase
      .from('gists')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection FAILED:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error);
    } else {
      console.log('✅ Connection SUCCESS!');
      console.log('   Database is accessible');
    }
  } catch (err) {
    console.error('❌ Connection ERROR:', err);
  }
  
  console.log('');
  
  // Check for gists
  console.log('📰 Checking for Published Gists...');
  try {
    const { data, error, count } = await supabase
      .from('gists')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .limit(5);
    
    if (error) {
      console.error('❌ Query FAILED:', error.message);
    } else {
      console.log(`✅ Found ${count || data?.length || 0} published gists`);
      if (data && data.length > 0) {
        console.log('   Latest gist:', data[0].headline);
      } else {
        console.log('   ⚠️  No gists found - this is normal if you haven\'t generated content yet');
        console.log('   💡 Go to /admin to generate a test gist');
      }
    }
  } catch (err) {
    console.error('❌ Query ERROR:', err);
  }
  
  console.log('\n✅ Test Complete!');
})();

