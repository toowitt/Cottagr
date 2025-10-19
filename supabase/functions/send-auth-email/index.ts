// supabase/functions/send-auth-email/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type EmailType = "signup" | "magiclink" | "recovery" | "email_change";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });

  const { email, type = "signup", password, redirectTo } = await req.json().catch(() => ({}));
  if (!email) return new Response("Missing 'email'", { status: 400 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const siteUrl     = Deno.env.get("SITE_URL")!;
  const resendKey   = Deno.env.get("RESEND_API_KEY")!;
  if (!resendKey) {
  console.error("Missing RESEND_API_KEY in env");
  return new Response("Server misconfigured", { status: 500 });
  }
  // Debug-safe: log prefix only
  console.log("Using RESEND_API_KEY prefix:", resendKey.slice(0, 5));
  const from        = Deno.env.get("FROM_EMAIL") || "Cottagr <no-reply@cottagr.com>";

  const admin = createClient(supabaseUrl, serviceKey);

  const { data, error } = await admin.auth.admin.generateLink({
    type: type as EmailType,
    email,
    password,
    options: { redirectTo: redirectTo ?? `${siteUrl}/auth/callback` },
  });
  if (error) return new Response(`Link error: ${error.message}`, { status: 500 });

  const actionLink =
    (data as any)?.properties?.action_link ||
    (data as any)?.action_link ||
    (data as any)?.email_otp?.action_link;

  if (!actionLink) return new Response("No action link produced", { status: 500 });

  const subject =
    type === "recovery" ? "Reset your Cottagr password"
    : type === "magiclink" ? "Your Cottagr sign-in link"
    : "Confirm your Cottagr email";

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto">
      <h2>${subject}</h2>
      <p><a href="${actionLink}" style="display:inline-block;padding:10px 16px;border:1px solid #ddd;border-radius:8px;text-decoration:none">Continue</a></p>
      <p>If that doesn’t work, paste this URL:</p>
      <p style="word-break:break-all">${actionLink}</p>
    </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject, html }),
  });

  if (!r.ok) return new Response(`Resend error: ${await r.text()}`, { status: 502 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
