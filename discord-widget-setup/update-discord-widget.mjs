import { writeFile } from "node:fs/promises";
import { buildWidgetData } from "./discord-widget-data.mjs";

const API_BASE = "https://discord.com/api";
const TOKEN = cleanEnv("DISCORD_BOT_TOKEN");
const ACCESS_TOKEN = cleanEnv("DISCORD_ACCESS_TOKEN");
const USER_ID_OVERRIDE = cleanEnv("DISCORD_USER_ID");
const APP_ID_OVERRIDE = cleanEnv("DISCORD_APP_ID");
const DRY_RUN = process.argv.includes("--dry-run");

if (!TOKEN) {
  console.error("Missing DISCORD_BOT_TOKEN.");
  console.error("PowerShell example:");
  console.error('$env:DISCORD_BOT_TOKEN = "paste-your-reset-bot-token-here"');
  console.error('$env:DISCORD_USER_ID = "263704115673038848"');
  console.error("node .\\update-discord-widget.mjs");
  process.exit(1);
}

const widgetData = await buildWidgetData();
await writeFile("widget-data.json", JSON.stringify(widgetData, null, 2), "utf8");
console.log("Built widget-data.json");

const application = await discordJson("GET", "/v10/oauth2/applications/@me");
const appId = APP_ID_OVERRIDE || application.id;
const inferredOwnerId = ownerIdFromApplication(application);
const userId = USER_ID_OVERRIDE || inferredOwnerId;
if (!appId || !userId) {
  throw new Error("Could not infer DISCORD_APP_ID or DISCORD_USER_ID. Set both env vars and run again.");
}

console.log(`Application: ${application.name || "(unnamed)"} (${appId})`);
console.log(`Identity user: ${userId}${USER_ID_OVERRIDE ? " (from DISCORD_USER_ID)" : " (inferred from app owner)"}`);
if (USER_ID_OVERRIDE && inferredOwnerId && USER_ID_OVERRIDE !== inferredOwnerId) {
  console.warn(`App owner from Discord is ${inferredOwnerId}, but DISCORD_USER_ID is ${USER_ID_OVERRIDE}.`);
  console.warn("That is fine only if you authorized the app while logged into DISCORD_USER_ID.");
}

await validateAgainstWidgetConfig(appId, widgetData);

if (DRY_RUN) {
  console.log("Dry run complete. Discord was not updated.");
  process.exit(0);
}

try {
  await discordJson("PATCH", `/v9/applications/${appId}/users/${userId}/identities/0/profile`, widgetData);
  console.log("Discord widget identity updated successfully.");
  console.log("If Discord still shows placeholders, wait a minute, reopen your profile, and confirm the widget config is published.");
} catch (error) {
  if (String(error.message || "").includes("50025") || /Invalid OAuth2 access token/i.test(error.body || "")) {
    if (ACCESS_TOKEN) {
      console.warn("Bot-token identity update returned 50025. Trying DISCORD_ACCESS_TOKEN as a Bearer token...");
      try {
        await discordJson("PATCH", `/v9/applications/${appId}/users/${userId}/identities/0/profile`, widgetData, { accessToken: ACCESS_TOKEN });
        console.log("Discord widget identity updated successfully with DISCORD_ACCESS_TOKEN.");
        process.exit(0);
      } catch (bearerError) {
        console.error(`Bearer fallback also failed: ${bearerError.message}`);
        if (bearerError.body) console.error(bearerError.body);
      }
    }
    console.error("Discord returned 50025: Invalid OAuth2 access token.");
    console.error("Authorize the application identity while logged into the same Discord account as DISCORD_USER_ID, then run this script again.");
    console.error("Try these URLs in order:");
    authUrls(appId).forEach((url) => console.error(url));
    console.error("If Discord redirects with an access_token in the URL, you can also test the Bearer fallback:");
    console.error('$env:DISCORD_ACCESS_TOKEN = "paste-access-token-from-redirect-url"');
    console.error("node .\\update-discord-widget.mjs");
    console.error("Also confirm the Social SDK form is completed in the Discord Developer Portal.");
    process.exit(1);
  }
  throw error;
}

async function validateAgainstWidgetConfig(appId, sampleData) {
  let configs = [];
  try {
    configs = await discordJson("GET", `/v10/applications/${appId}/widget-configs`);
  } catch (error) {
    console.warn(`Could not fetch widget config for validation: ${error.message}`);
    return;
  }

  const configList = Array.isArray(configs) ? configs : [configs].filter(Boolean);
  if (!configList.length) {
    console.warn("No widget config found. Create and publish the widget in Discord first.");
    return;
  }

  for (const config of configList) {
    const status = String(config.status || "unknown");
    const configId = config.config_id || config.id || "(unknown config)";
    console.log(`Widget config: ${configId}, status: ${status}`);
    if (status !== "published") console.warn("Widget config is not published. Discord may keep showing placeholders.");
  }

  const specs = extractDynamicFields(configList);
  if (!specs.length) {
    console.warn("No dynamic fields found in the widget config. Make sure each dynamic value is set to User Data.");
    return;
  }

  const sampleByName = new Map((sampleData.data?.dynamic || []).map((entry) => [entry.name, entry]));
  const errors = [];
  for (const spec of specs) {
    const entry = sampleByName.get(spec.name);
    if (!entry) {
      errors.push(`Missing field '${spec.name}' (${spec.presentationType})`);
      continue;
    }
    const expectedType = discordTypeForPresentation(spec.presentationType);
    if (expectedType && entry.type !== expectedType) {
      errors.push(`Field '${spec.name}' is type ${entry.type}, but widget config expects ${spec.presentationType} (type ${expectedType})`);
    }
  }

  if (errors.length) {
    console.error("Widget data does not match Discord's widget config:");
    errors.forEach((error) => console.error(`- ${error}`));
    console.error("Fix the Discord widget fields or this script's field list before applying.");
    process.exit(1);
  }

  console.log(`Validated ${specs.length} dynamic field(s) against Discord's widget config.`);
}

function extractDynamicFields(configs) {
  const fields = new Map();
  for (const config of configs) {
    const surfaces = config?.surfaces && typeof config.surfaces === "object" ? config.surfaces : {};
    for (const surface of Object.values(surfaces)) {
      const components = surface?.components && typeof surface.components === "object" ? surface.components : {};
      for (const component of Object.values(components)) {
        const componentFields = component?.fields && typeof component.fields === "object" ? component.fields : {};
        for (const field of Object.values(componentFields)) {
          if (field?.value_type !== "data" || !field.value) continue;
          fields.set(field.value, {
            name: field.value,
            presentationType: String(field.presentation_type || "text"),
          });
        }
      }
    }
  }
  return [...fields.values()];
}

function discordTypeForPresentation(presentationType) {
  const value = String(presentationType || "").toLowerCase();
  if (value === "image") return 3;
  if (["number", "float", "integer", "double", "decimal"].includes(value)) return 2;
  if (value === "text") return 1;
  return 0;
}

async function discordJson(method, path, body, options = {}) {
  const authHeader = options.accessToken ? `Bearer ${options.accessToken}` : `Bot ${TOKEN}`;
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: authHeader,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = text;
  }
  if (!response.ok) {
    const error = new Error(`Discord API ${method} ${path} failed (${response.status})`);
    error.status = response.status;
    error.body = typeof data === "string" ? data : JSON.stringify(data);
    throw error;
  }
  return data;
}

function ownerIdFromApplication(application) {
  return application?.owner?.id || application?.team?.owner_user_id || "";
}

function cleanEnv(name) {
  return String(process.env[name] || "").trim().replace(/^["']|["']$/g, "");
}

function authUrls(appId) {
  return [
    `https://discord.com/oauth2/authorize?client_id=${appId}&response_type=token&scope=sdk.social_layer_presence&prompt=consent`,
    `https://discord.com/oauth2/authorize?client_id=${appId}&response_type=token&scope=openid%20sdk.social_layer_presence&prompt=consent`,
    `https://discord.com/oauth2/authorize?client_id=${appId}&response_type=token&scope=openid%20sdk.social_layer&prompt=consent`,
  ];
}
