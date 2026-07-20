import { isEditorRequest } from "./editor-auth.js";

const ORIGINAL_REPO = "https://github.com/ShabiiEXE/Gamelist";
const ORIGINAL_FULL_NAME = "ShabiiEXE/Gamelist";
const CACHE_MS = 15 * 60 * 1000;
const GITHUB_API = "https://api.github.com";
const GITLAB_API = "https://gitlab.com/api/v4";
const REQUIRED_FILES = new Set(["app.js", "shelf.js", "worker.js", "wrangler.toml", "README.md"]);
const README_MARKERS = [
  "github.com/ShabiiEXE/Gamelist",
  "https://github.com/ShabiiEXE/Gamelist",
  "ShabiiEXE",
];
const GITHUB_SEEDS = [
  { fullName: ORIGINAL_FULL_NAME },
  { fullName: "Insomniac1985/gamelist" },
  { fullName: "totomitjans/gamelist", siteUrl: "https://gamelist.totomitjans.workers.dev/" },
];
let repoCache;

export async function onRequestGet({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  if (!fresh && repoCache && Date.now() < repoCache.expiresAt) return json(repoCache.value);
  const repos = await findRepoCopies(env);
  const value = { originalRepo: ORIGINAL_REPO, count: repos.length, repos, updatedAt: new Date().toISOString() };
  repoCache = { value, expiresAt: Date.now() + CACHE_MS };
  return json(value);
}

async function findRepoCopies(env = {}) {
  const byUrl = new Map();
  const candidates = await Promise.allSettled([
    findGithubCandidates(env),
    findGitlabCandidates(),
  ]);
  for (const result of candidates) {
    if (result.status !== "fulfilled") continue;
    for (const repo of result.value) byUrl.set(repo.url.toLowerCase(), repo);
  }
  return [...byUrl.values()]
    .filter((repo) => !repoUrlsMatch(repo.url, ORIGINAL_REPO))
    .sort((a, b) => a.url.localeCompare(b.url));
}

async function findGithubCandidates(env = {}) {
  const token = String(env.GITHUB_WORKFLOW_TOKEN || env.GITHUB_TOKEN || "").trim();
  const headers = githubHeaders(token);
  const repos = new Map();
  for (const seed of GITHUB_SEEDS) {
    const repo = await githubSeedRepo(seed) || githubStaticSeed(seed) || await githubRepo(seed.fullName, headers);
    if (repo) repos.set(repo.full_name, repo);
  }
  const search = await githubJson(`${GITHUB_API}/search/repositories?${new URLSearchParams({
    q: "gamelist language:JavaScript created:>2026-06-01",
    sort: "updated",
    order: "desc",
    per_page: "50",
  })}`, headers);
  for (const repo of search?.items || []) {
    if (repo?.full_name && !repos.has(repo.full_name)) repos.set(repo.full_name, repo);
  }
  const checked = await Promise.all([...repos.values()].map((repo) => verifyGithubRepo(repo, headers)));
  return checked.filter(Boolean);
}

async function verifyGithubRepo(repo, headers) {
  const fullName = String(repo.full_name || "");
  const [contents, readme, deployedUrl] = await Promise.all([
    repo.rawFallback ? [...REQUIRED_FILES].map((name) => ({ name })) : githubJson(`${GITHUB_API}/repos/${fullName}/contents`, headers).catch(() => []),
    repo.seedReadme || fetchText(`https://raw.githubusercontent.com/${fullName}/${repo.default_branch || "main"}/README.md`).catch(() => ""),
    repo.rawFallback ? "" : githubDeploymentUrl(fullName, headers),
  ]);
  if (!hasRequiredFiles(contents?.map((item) => item?.name))) return null;
  if (!mentionsOriginal(readme)) return null;
  const url = cleanUrl(repo.html_url);
  return {
    provider: "github",
    name: fullName,
    url,
    siteUrl: siteUrlFor(repo.homepage, readme, deployedUrl),
    updatedAt: repo.pushed_at || repo.updated_at || "",
  };
}

async function findGitlabCandidates() {
  const seeds = ["shabiimitjans/gamelist"];
  const projects = new Map();
  for (const path of seeds) {
    const project = await gitlabProject(path);
    if (project) projects.set(project.path_with_namespace, project);
  }
  const search = await fetchJson(`${GITLAB_API}/projects?${new URLSearchParams({
    search: "gamelist",
    simple: "true",
    per_page: "50",
    order_by: "last_activity_at",
    sort: "desc",
  })}`);
  for (const project of search || []) {
    if (project?.path_with_namespace) projects.set(project.path_with_namespace, project);
  }
  const checked = await Promise.all([...projects.values()].map((project) => verifyGitlabProject(project)));
  return checked.filter(Boolean);
}

async function verifyGitlabProject(project) {
  const id = encodeURIComponent(project.path_with_namespace);
  const [tree, readme, deployedUrl] = await Promise.all([
    fetchJson(`${GITLAB_API}/projects/${id}/repository/tree?per_page=100`).catch(() => []),
    fetchText(`https://gitlab.com/${project.path_with_namespace}/-/raw/${project.default_branch || "main"}/README.md`).catch(() => ""),
    gitlabEnvironmentUrl(id),
  ]);
  if (!hasRequiredFiles(tree?.map((item) => item?.name))) return null;
  if (!mentionsOriginal(readme)) return null;
  const url = cleanUrl(project.web_url);
  return {
    provider: "gitlab",
    name: project.path_with_namespace,
    url,
    siteUrl: siteUrlFor(project.description, readme, deployedUrl),
    updatedAt: project.last_activity_at || "",
  };
}

async function githubRepo(fullName, headers) {
  return await githubJson(`${GITHUB_API}/repos/${fullName}`, headers).catch(() => null);
}

async function githubSeedRepo(seed) {
  const fullName = seed.fullName;
  for (const branch of ["main", "master"]) {
    const readme = await fetchText(`https://raw.githubusercontent.com/${fullName}/${branch}/README.md`).catch(() => "");
    if (!mentionsOriginal(readme)) continue;
    return {
      full_name: fullName,
      html_url: `https://github.com/${fullName}`,
      default_branch: branch,
      homepage: seed.siteUrl || await githubPageSiteUrl(fullName),
      pushed_at: "",
      updated_at: "",
      seedReadme: readme,
      rawFallback: true,
    };
  }
  return null;
}

function githubStaticSeed(seed) {
  if (!seed?.fullName) return null;
  return {
    full_name: seed.fullName,
    html_url: `https://github.com/${seed.fullName}`,
    default_branch: "main",
    homepage: seed.siteUrl || "",
    pushed_at: "",
    updated_at: "",
    seedReadme: README_MARKERS[0],
    rawFallback: true,
  };
}

async function githubPageSiteUrl(fullName) {
  const html = await fetchText(`https://github.com/${fullName}`).catch(() => "");
  return siteUrlFromText(html);
}

async function gitlabProject(path) {
  return await fetchJson(`${GITLAB_API}/projects/${encodeURIComponent(path)}`).catch(() => null);
}

async function githubDeploymentUrl(fullName, headers) {
  const deployments = await githubJson(`${GITHUB_API}/repos/${fullName}/deployments?per_page=10`, headers).catch(() => []);
  for (const deployment of deployments || []) {
    const direct = cleanUrl(deployment?.environment_url || deployment?.payload?.web_url || "");
    if (isLikelySiteUrl(direct)) return direct;
    const statusesUrl = deployment?.statuses_url;
    if (!statusesUrl) continue;
    const statuses = await githubJson(`${statusesUrl}?per_page=5`, headers).catch(() => []);
    for (const status of statuses || []) {
      const url = cleanUrl(status?.environment_url || status?.target_url || status?.log_url || "");
      if (isLikelySiteUrl(url)) return url;
    }
  }
  return "";
}

async function gitlabEnvironmentUrl(projectId) {
  const environments = await fetchJson(`${GITLAB_API}/projects/${projectId}/environments?per_page=20`).catch(() => []);
  for (const environment of environments || []) {
    const url = cleanUrl(environment?.external_url || "");
    if (isLikelySiteUrl(url)) return url;
  }
  return "";
}

function githubHeaders(token = "") {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "gamelist-repo-copies",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function githubJson(url, headers) {
  return await fetchJson(url, { headers });
}

async function fetchJson(url, options = {}) {
  const response = await safeFetch(url, options);
  if (!response?.ok) return null;
  return await response.json().catch(() => null);
}

async function fetchText(url, options = {}) {
  const response = await safeFetch(url, options);
  if (!response?.ok) return "";
  return await response.text();
}

async function safeFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function hasRequiredFiles(names = []) {
  const present = new Set(names.filter(Boolean));
  return [...REQUIRED_FILES].every((name) => present.has(name));
}

function mentionsOriginal(text = "") {
  return README_MARKERS.some((marker) => text.includes(marker));
}

function siteUrlFor(homepage = "", readme = "", deployedUrl = "") {
  const deployed = cleanUrl(deployedUrl);
  if (isLikelySiteUrl(deployed)) return deployed;
  const home = cleanUrl(homepage);
  if (isLikelySiteUrl(home)) return home;
  return siteUrlFromText(readme);
}

function siteUrlFromText(text = "") {
  const urls = String(text || "").match(/https?:\/\/[^\s)\]`"'<>]+/g) || [];
  return urls
    .map((url) => cleanUrl(url.replace(/&amp;/g, "&")))
    .find((url) => isLikelySiteUrl(url) && /\.workers\.dev\/?$/i.test(url)) || "";
}

function isLikelySiteUrl(value) {
  const url = cleanUrl(value);
  return Boolean(url && !/github\.com|gitlab\.com|cloudflare\.com|twitch\.tv|x\.com|twitter\.com|playstation\.com|sony\.com|steamcommunity\.com|xbl\.io|google\.com|simpleicons\.org|wikimedia\.org|localhost|favicon\.ico|\.(png|jpe?g|svg|webp|ico)(\?|$)/i.test(url));
}

function cleanUrl(value) {
  return String(value || "").trim().replace(/[",.;)]+$/, "");
}

function repoUrlsMatch(left, right) {
  return normalizeRepoUrl(left) === normalizeRepoUrl(right);
}

function normalizeRepoUrl(value) {
  return String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\.git$/, "").replace(/\/$/, "");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}
