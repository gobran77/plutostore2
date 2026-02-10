import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  customer_id: string;
  whatsapp_number: string;
  activation_code: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") ||
      Deno.env.get("VITE_SUPABASE_URL") ||
      "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error:
            "Supabase service role is not configured for this function (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json()) as Partial<RequestBody>;
    const customer_id = String(body.customer_id || "").trim();
    const whatsapp_number = String(body.whatsapp_number || "").trim();
    const activation_code = String(body.activation_code || "").trim();

    if (!customer_id || !whatsapp_number || !activation_code) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: customer_id, whatsapp_number, activation_code",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Verify customer identity using WhatsApp + activation code.
    const { data: customer, error: custErr } = await admin
      .from("customer_accounts")
      .select("id, whatsapp_number, activation_code, is_admin, account_type")
      .eq("id", customer_id)
      .eq("whatsapp_number", whatsapp_number)
      .maybeSingle();

    if (custErr) throw custErr;
    if (!customer) {
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const isAdmin = (customer as any).is_admin === true ||
      (customer as any).account_type === "admin";
    if (isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (String((customer as any).activation_code || "") !== activation_code) {
      return new Response(
        JSON.stringify({ error: "Invalid activation code" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: subscriptions, error: subsErr } = await admin
      .from("customer_subscriptions")
      .select("*, service_slots(email, password, slot_name, updated_at)")
      .eq("customer_id", customer_id)
      .order("end_date", { ascending: false });

    if (subsErr) throw subsErr;

    return new Response(
      JSON.stringify({ success: true, subscriptions: subscriptions || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("get-customer-subscriptions error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

