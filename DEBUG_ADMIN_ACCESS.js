// Complete diagnostic script for admin access
// Run this in browser console (F12) on any page

(async () => {
  console.log('🔍 ADMIN ACCESS DIAGNOSTIC\n');
  
  // Step 1: Check if user is logged in
  console.log('1️⃣ Checking authentication...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('❌ Not logged in:', authError);
    console.log('   → Sign in first');
    return;
  }
  
  console.log('✅ Logged in as:', user.email);
  console.log('   User ID:', user.id);
  console.log('');
  
  // Step 2: Check user_roles table directly
  console.log('2️⃣ Checking user_roles table...');
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id);
  
  if (rolesError) {
    console.error('❌ Error querying user_roles:', rolesError);
    console.error('   Message:', rolesError.message);
    console.error('   Code:', rolesError.code);
    console.error('   Details:', rolesError.details);
  } else {
    console.log('   Roles found:', roles);
    if (roles && roles.length > 0) {
      const adminRole = roles.find(r => r.role === 'admin');
      if (adminRole) {
        console.log('✅ Admin role exists in user_roles table');
      } else {
        console.log('❌ Admin role NOT found in user_roles table');
        console.log('   Found roles:', roles.map(r => r.role));
      }
    } else {
      console.log('❌ No roles found for this user');
      console.log('   → Need to add admin role via SQL');
    }
  }
  console.log('');
  
  // Step 3: Test has_role function
  console.log('3️⃣ Testing has_role function...');
  const { data: hasAdminRole, error: rpcError } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });
  
  if (rpcError) {
    console.error('❌ Error calling has_role function:', rpcError);
    console.error('   Message:', rpcError.message);
    console.error('   Code:', rpcError.code);
    console.error('   Details:', rpcError.details);
    console.error('   Hint:', rpcError.hint);
    
    if (rpcError.message.includes('function') || rpcError.message.includes('does not exist')) {
      console.error('\n⚠️  has_role function might not exist!');
      console.error('   → Check if migration was applied correctly');
    }
  } else {
    console.log('   has_role result:', hasAdminRole);
    if (hasAdminRole === true) {
      console.log('✅ has_role function returns TRUE - admin access should work!');
    } else {
      console.log('❌ has_role function returns FALSE');
      console.log('   → Even though role exists in table, function returns false');
      console.log('   → This might be an RLS policy issue');
    }
  }
  console.log('');
  
  // Step 4: Summary
  console.log('📋 SUMMARY:');
  console.log('   User ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Roles in table:', roles?.map(r => r.role) || 'none');
  console.log('   has_role("admin"):', hasAdminRole);
  console.log('');
  
  if (hasAdminRole === true) {
    console.log('✅ Everything looks good!');
    console.log('   → Try signing out and back in');
    console.log('   → Then navigate to /admin');
  } else {
    console.log('❌ Issues found:');
    if (!roles || roles.length === 0) {
      console.log('   1. No roles in user_roles table');
      console.log('      → Add admin role via SQL Editor');
    } else if (!roles.find(r => r.role === 'admin')) {
      console.log('   1. Admin role not in user_roles table');
      console.log('      → Add admin role via SQL Editor');
    }
    if (rpcError) {
      console.log('   2. has_role function error');
      console.log('      → Check function exists in database');
    } else if (hasAdminRole === false) {
      console.log('   2. has_role returns false despite role existing');
      console.log('      → Check RLS policies on user_roles table');
    }
  }
  
  console.log('\n✅ Diagnostic complete!');
})();

