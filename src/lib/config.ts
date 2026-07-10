// Set to "false" (in .env.local / Vercel env vars) to close new signups without
// removing any code — flip it back to "true" to reopen. Existing accounts can
// always log in regardless of this flag.
export const registrationAvailable = process.env.NEXT_PUBLIC_REGISTRATION_AVAILABLE !== 'false';
