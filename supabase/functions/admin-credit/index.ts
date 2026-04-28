import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const body = await req.json();
  const action = body.action;
  if (action === 'list-users') {
    const { data } = await supabase.auth.admin.listUsers();
    return new Response(JSON.stringify({ users: (data?.users ?? []).map(u => ({ id: u.id, phone: u.phone, email: u.email })) }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (action === 'credit') {
    const { userId, amount } = body;
    const { data: existing } = await supabase.from('profiles').select('wallet_balance').eq('id', userId).single();
    const newBalance = (existing?.wallet_balance ?? 0) + amount;
    await supabase.from('profiles').upsert({ id: userId, wallet_balance: newBalance, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    return new Response(JSON.stringify({ success: true, newBalance }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (action === 'check-profile') {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', body.userId).single();
    return new Response(JSON.stringify({ profile: data, error: error?.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (action === 'fix-rls') {
    // Désactiver RLS sur profiles pour que les users puissent lire
    // En fait la bonne approche : ajouter des policies
    return new Response(JSON.stringify({ message: 'Run in SQL Editor: CREATE POLICY users_read ON profiles FOR SELECT USING (auth.uid() = id); CREATE POLICY users_write ON profiles FOR ALL USING (auth.uid() = id);' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
