// Returns true when TURNSTILE_SECRET_KEY is unset (local dev auto-pass).
export async function verifyCaptcha(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v1/siteverify', {
    method: 'POST',
    body,
  });
  const data: { success: boolean } = await res.json();
  return data.success === true;
}
