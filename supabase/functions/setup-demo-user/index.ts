import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // First check if the user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    const demoUser = authUser?.users.find(user => user.email === 'demo@example.com');
    
    if (demoUser) {
      // User exists in auth, check if they exist in public.users
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'demo@example.com')
        .single();

      if (!publicUser && !publicError) {
        // Create the public user record if it doesn't exist
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: demoUser.id,
              email: demoUser.email,
            },
          ]);

        if (insertError) throw insertError;
      }

      return new Response(
        JSON.stringify({ 
          message: 'Demo user exists and is ready to use',
          user: demoUser 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new demo user if they don't exist
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'demo@example.com',
      password: 'demo123!',
      email_confirm: true,
    });

    if (createError) throw createError;

    // The trigger should automatically create the public.users record,
    // but let's ensure it exists
    const { data: checkUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', newUser.user.id)
      .single();

    if (!checkUser && !checkError) {
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: newUser.user.id,
            email: newUser.user.email,
          },
        ]);

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        message: 'Demo user created successfully',
        user: newUser.user,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Setup demo user error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to setup demo user. Please try again.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});