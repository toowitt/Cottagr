#!/usr/bin/env node
const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
];

const missing = required.filter((k) => !process.env[k])

if (missing.length) {
    console.error('Missing required env vars:', missing.join(', '))
    process.exit(1)
}

const usingResend = Boolean(process.env.RESEND_API_KEY)
const supabaseSmtpKeys = [
    'SUPABASE_SMTP_HOST',
    'SUPABASE_SMTP_PORT',
    'SUPABASE_SMTP_USER',
    'SUPABASE_SMTP_PASS',
    'SUPABASE_SMTP_SENDER'
]
const usingSupabaseSmtp = supabaseSmtpKeys.some((key) => Boolean(process.env[key]))

if (usingResend && usingSupabaseSmtp) {
    console.error('Configure either Resend (RESEND_API_KEY) or Supabase SMTP (SUPABASE_SMTP_*) — not both.')
    process.exit(1)
}

console.log('All required env vars set')
