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
const KNOWN_SITE_URLS = {
  "github.com/insomniac1985/gamelist": "https://gamelist.jono-part2.workers.dev/",
  "gitlab.com/shabiimitjans/gamelist": "https://gamelist.shabiimitjans.workers.dev/",
};
let repoCache;

export async function onRequestGet({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  if (repoCache && Date.now() < repoCache.expiresAt) return json(repoCache.value);
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
  const seeds = [
    ORIGINAL_FULL_NAME,
    "Insomniac1985/gamelist",
    "totomitjans/gamelist",
  ];
  const repos = new Map();
  for (const fullName of seeds) {
    const repo = await githubRepo(fullName, headers);
    if (repo) repos.set(repo.full_name, repo);
  }
  const search = await githubJson(`${GITHUB_API}/search/repositories?${new URLSearchParams({
    q: "gamelist language:JavaScript created:>2026-06-01",
    sort: "updated",
    order: "desc",
    per_page: "50",
  })}`, headers);
  for (const repo of search?.items || []) {
    if (repo?.full_name) repos.set(repo.full_name, repo);
  }
  const checked = await Promise.all([...repos.values()].map((repo) => verifyGithubRepo(repo, headers)));
  return checked.filter(Boolean);
}

async function verifyGithubRepo(repo, headers) {
  const fullName = String(repo.full_name || "");
  const [contents, readme] = await Promise.all([
    githubJson(`${GITHUB_API}/repos/${fullName}/contents`, headers).catch(() => []),
    fetchText(`https://raw.githubusercontent.com/${fullName}/${repo.default_branch || "main"}/README.md`).catch(() => ""),
  ]);
  if (!hasRequiredFiles(contents?.map((item) => item?.name))) return null;
  if (!mentionsOriginal(readme)) return null;
  const url = cleanUrl(repo.html_url);
  return {
    provider: "github",
    name: fullName,
    url,
    siteUrl: siteUrlFor(url, repo.homepage, readme),
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
  const checked = await Promise.all([...projects.values()].map(verifyGitlabProject));
  return checked.filter(Boolean);
}

async function verifyGitlabProject(project) {
  const id = encodeURIComponent(project.path_with_namespace);
  const [tree, readme] = await Promise.all([
    fetchJson(`${GITLAB_API}/projects/${id}/repository/tree?per_page=100`).catch(() => []),
    fetchText(`https://gitlab.com/${project.path_with_namespace}/-/raw/${project.default_branch || "main"}/README.md`).catch(() => ""),
  ]);
  if (!hasRequiredFiles(tree?.map((item) => item?.name))) return null;
  if (!mentionsOriginal(readme)) return null;
  const url = cleanUrl(project.web_url);
  return {
    provider: "gitlab",
    name: project.path_with_namespace,
    url,
    siteUrl: siteUrlFor(url, "", readme),
    updatedAt: project.last_activity_at || "",
  };
}

async function githubRepo(fullName, headers) {
  return await githubJson(`${GITHUB_API}/repos/${fullName}`, headers).catch(() => null);
}

async function gitlabProject(path) {
  return await fetchJson(`${GITLAB_API}/projects/${encodeURIComponent(path)}`).catch(() => null);
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

function siteUrlFor(repoUrl, homepage = "", readme = "") {
  const known = KNOWN_SITE_URLS[normalizeRepoUrl(repoUrl)];
  if (known) return known;
  const home = cleanUrl(homepage);
  if (isLikelySiteUrl(home)) return home;
  const urls = String(readme || "").match(/https?:\/\/[^\s)\]`"']+/g) || [];
  return urls.map(cleanUrl).find((url) => isLikelySiteUrl(url) && /\.workers\.dev\/?$/i.test(url)) || "";
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
