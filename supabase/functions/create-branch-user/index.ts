import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is superadmin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!).auth.getUser(token);
    if (!caller) throw new Error("Unauthorized");

    const { data: callerRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "superadmin").single();
    if (!callerRole) throw new Error("Only superadmin can create branch users");

    const { phone, password, full_name, branch_id } = await req.json();
    if (!phone || !password || !branch_id) throw new Error("phone, password, and branch_id are required");

    // Create synthetic email from phone
    const email = `${phone.replace(/\D/g, "")}@welcomereward.app`;

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "branch", full_name: full_name || "", phone },
    });
    if (createError) throw createError;

    // Link user to branch
    const { error: linkError } = await supabaseAdmin.from("branch_users").insert({
      user_id: newUser.user.id,
      branch_id,
    });
    if (linkError) throw linkError;

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
