#!/usr/bin/env node
const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_APP_NAME'
]

const missing = required.filter((k) => !process.env[k])

if (missing.length) {
    console.error('Missing required env vars:', missing.join(', '))
    process.exit(1)
}

console.log('All required env vars set')
