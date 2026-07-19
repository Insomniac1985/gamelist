export async function onRequestGet({ env = {} }) {
  const isSet = (value) => Boolean(String(value || "").trim());
  return json({
    PSN_NPSSO: isSet(env.PSN_NPSSO),
    OPENXBL_API_KEY: isSet(env.OPENXBL_API_KEY),
    STEAM_API_KEY: isSet(env.STEAM_API_KEY),
    IGDB_TWITCH: isSet(env.IGDB_CLIENT_ID) && isSet(env.IGDB_CLIENT_SECRET),
    GOOGLE_PRIVATE_KEY: isSet(env.GOOGLE_PRIVATE_KEY),
  });
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}
