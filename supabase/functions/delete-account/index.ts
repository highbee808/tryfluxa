import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🗑️ Initiating account deletion for user: ${user.id}`)

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Delete user data in order (respecting foreign keys)
    const deletionSteps = [
      { name: 'user_favorites', table: 'user_favorites' },
      { name: 'user_follows (as follower)', table: 'user_follows', column: 'follower_id' },
      { name: 'user_follows (as following)', table: 'user_follows', column: 'following_id' },
      { name: 'fan_follows', table: 'fan_follows' },
      { name: 'fan_posts', table: 'fan_posts' },
      { name: 'fanbase_threads', table: 'fanbase_threads' },
      { name: 'sports_fan_reactions', table: 'sports_fan_reactions' },
      { name: 'story_reactions', table: 'story_reactions' },
      { name: 'live_participants', table: 'live_participants' },
      { name: 'live_reactions', table: 'live_reactions' },
      { name: 'notifications', table: 'notifications' },
      { name: 'user_interests', table: 'user_interests' },
      { name: 'user_subniches', table: 'user_subniches' },
      { name: 'user_teams', table: 'user_teams' },
      { name: 'fluxa_memory', table: 'fluxa_memory' },
      { name: 'user_conversations', table: 'user_conversations' },
    ]

    const results = []

    for (const step of deletionSteps) {
      try {
        const column = step.column || 'user_id'
        const { error, count } = await supabaseAdmin
          .from(step.table)
          .delete({ count: 'exact' })
          .eq(column, user.id)

        if (error) {
          console.error(`❌ Error deleting ${step.name}:`, error.message)
          results.push({ step: step.name, success: false, error: error.message })
        } else {
          console.log(`✅ Deleted ${count || 0} records from ${step.name}`)
          results.push({ step: step.name, success: true, deleted: count || 0 })
        }
      } catch (error) {
        console.error(`❌ Exception deleting ${step.name}:`, error)
        results.push({ 
          step: step.name, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    // Delete avatar from storage
    try {
      const { data: files } = await supabaseAdmin.storage
        .from('avatars')
        .list(user.id)

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`)
        const { error: storageError } = await supabaseAdmin.storage
          .from('avatars')
          .remove(filePaths)

        if (storageError) {
          console.error('⚠️ Error deleting avatar:', storageError.message)
          results.push({ step: 'avatar storage', success: false, error: storageError.message })
        } else {
          console.log(`✅ Deleted ${files.length} avatar file(s)`)
          results.push({ step: 'avatar storage', success: true, deleted: files.length })
        }
      }
    } catch (error) {
      console.error('⚠️ Exception deleting avatar:', error)
    }

    // Delete profile (should cascade automatically, but explicit for safety)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', user.id)

    if (profileError) {
      console.error('❌ Error deleting profile:', profileError.message)
      results.push({ step: 'profile', success: false, error: profileError.message })
    } else {
      console.log('✅ Deleted profile')
      results.push({ step: 'profile', success: true, deleted: 1 })
    }

    // Finally, delete the auth user (this is the most critical step)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      console.error('❌ CRITICAL: Failed to delete auth user:', deleteUserError.message)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete account', 
          details: deleteUserError.message,
          partial_results: results 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Successfully deleted auth user')
    console.log('🎉 Account deletion complete')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account successfully deleted',
        details: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Account deletion error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to delete account',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})