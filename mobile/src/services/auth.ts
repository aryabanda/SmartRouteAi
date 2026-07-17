// Talks to the backend's /api/auth endpoints. Same BACKEND_URL pattern as
// route.ts/search.ts - keep all three in sync if you consolidate later.

const BACKEND_URL = 'http://localhost:4000'; // <-- match route.ts / search.ts

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type AuthResult = {
  token: string;
  user: PublicUser;
};

async function handleAuthResponse(res: Response): Promise<AuthResult> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body;
}

export async function registerRequest(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name, email, password}),
  });
  return handleAuthResponse(res);
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthResult> {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password}),
  });
  return handleAuthResponse(res);
}
