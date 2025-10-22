import '@testing-library/jest-dom/vitest';

process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:5000';
process.env.NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_TO ??= 'http://localhost:5000/auth/callback';
