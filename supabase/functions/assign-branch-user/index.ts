import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is superadmin
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await createClient(supabaseUrl, anonKey).auth.getUser(token);
    if (!caller) throw new Error("Unauthorized");

    const { data: callerRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "superadmin").single();
    if (!callerRole) throw new Error("Only superadmin can assign branch users");

    const { user_id, branch_id } = await req.json();
    if (!user_id || !branch_id) throw new Error("user_id and branch_id are required");

    // Update profile role to branch
    const { error: profileError } = await supabaseAdmin.from("profiles").update({ role: "branch" }).eq("id", user_id);
    if (profileError) throw profileError;

    // Update user_roles
    const { data: existingRole } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", user_id).single();
    if (existingRole) {
      await supabaseAdmin.from("user_roles").update({ role: "branch" }).eq("user_id", user_id);
    } else {
      await supabaseAdmin.from("user_roles").insert({ user_id, role: "branch" });
    }

    // Remove old branch_users entry if any
    await supabaseAdmin.from("branch_users").delete().eq("user_id", user_id);

    // Link to branch
    const { error: linkError } = await supabaseAdmin.from("branch_users").insert({ user_id, branch_id });
    if (linkError) throw linkError;

    // Remove customer record if exists (branch users shouldn't be customers)
    await supabaseAdmin.from("customers").delete().eq("user_id", user_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
