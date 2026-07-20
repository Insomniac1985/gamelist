const PSN_AUTH_BASE = "https://ca.account.sony.com/api/authz/v3/oauth";
const PSN_CLIENT_ID = "09515159-7237-4370-9b40-3806e67c0891";
const PSN_REDIRECT_URI = "com.scee.psxandroid.scecompcall://redirect";
const PSN_BASIC_AUTH = "Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=";

let tokenCache;
let tokenPromise;

export async function getPsnAccessToken(npsso) {
  const secret = String(npsso || "").trim();
  if (!secret) throw new Error("Missing PSN_NPSSO");
  if (tokenCache?.npsso === secret && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  if (tokenPromise?.npsso === secret) return tokenPromise.promise;

  const promise = exchangeNpsso(secret)
    .then(({ token, expiresIn }) => {
      tokenCache = {
        npsso: secret,
        token,
        expiresAt: Date.now() + Math.max(300, expiresIn - 300) * 1000,
      };
      return token;
    })
    .finally(() => {
      if (tokenPromise?.promise === promise) tokenPromise = null;
    });
  tokenPromise = { npsso: secret, promise };
  return promise;
}

async function exchangeNpsso(npsso) {
  const codeUrl = `${PSN_AUTH_BASE}/authorize?${new URLSearchParams({
    access_type: "offline",
    client_id: PSN_CLIENT_ID,
    redirect_uri: PSN_REDIRECT_URI,
    response_type: "code",
    scope: "psn:mobile.v2.core psn:clientapp",
  })}`;
  const codeResponse = await fetch(codeUrl, {
    headers: { Cookie: `npsso=${npsso}` },
    redirect: "manual",
  });
  const location = codeResponse.headers.get("location") || "";
  if (!location.includes("?code=")) throw new Error(`Missing PSN access code (${codeResponse.status})`);
  const code = new URLSearchParams(location.split("redirect/")[1]).get("code");
  if (!code) throw new Error("Missing PSN code");

  const tokenResponse = await fetch(`${PSN_AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: PSN_BASIC_AUTH,
    },
    body: new URLSearchParams({
      code,
      redirect_uri: PSN_REDIRECT_URI,
      grant_type: "authorization_code",
      token_format: "jwt",
    }).toString(),
  });
  if (!tokenResponse.ok) throw new Error(`PSN token exchange failed (${tokenResponse.status})`);
  const data = await tokenResponse.json();
  if (!data.access_token) throw new Error("Missing PSN access token");
  return { token: data.access_token, expiresIn: Number(data.expires_in || 3600) };
}
