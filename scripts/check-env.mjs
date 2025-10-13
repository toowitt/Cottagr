#!/usr/bin/env node
const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
];

const missing = required.filter((k) => !process.env[k])

if (missing.length) {
    console.error('Missing required env vars:', missing.join(', '))
    process.exit(1)
}

console.log('All required env vars set')
