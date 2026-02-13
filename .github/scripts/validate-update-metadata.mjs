import https from "node:https";
import { extractReferencedAssetNames } from "./update-site-lib.mjs";

const REQUIRED_ENV = ["RELEASE_ID", "TAG_NAME", "REPO_OWNER", "REPO_NAME"];
const GITHUB_API_BASE = new URL("https://api.github.com");
const GITHUB_REPO_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;
const GITHUB_RELEASE_ID_PATTERN = /^\d+$/;

function readEnv(name) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function readJsonFromStdin() {
  let source = "";
  for await (const chunk of process.stdin) {
    source += chunk;
  }

  if (!source.trim()) {
    throw new Error("Expected manifest JSON on stdin.");
  }

  return JSON.parse(source);
}

function normalizeManifestEntries(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Expected at least one updater metadata entry on stdin.");
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Invalid manifest entry at index ${index}.`);
    }

    const name = String(entry.name || "").trim();
    const content = typeof entry.content === "string" ? entry.content : "";

    if (!name) {
      throw new Error(`Manifest entry ${index} is missing a file name.`);
    }
    if (!/\.(ya?ml)$/i.test(name)) {
      throw new Error(`Manifest entry ${name} is not a YAML file.`);
    }
    if (!content) {
      throw new Error(`Manifest entry ${name} is missing file content.`);
    }

    return { name, content };
  });
}

function normalizeRepoSegment(segmentName, value) {
  const normalized = String(value || "").trim();
  if (!GITHUB_REPO_SEGMENT_PATTERN.test(normalized)) {
    throw new Error(`Invalid repository ${segmentName}: ${value}`);
  }
  return normalized;
}

function normalizeReleaseId(value) {
  const normalized = String(value || "").trim();
  if (!GITHUB_RELEASE_ID_PATTERN.test(normalized)) {
    throw new Error(`Invalid release ID: ${value}`);
  }
  return normalized;
}

function buildGitHubRepoBasePath(owner, repo) {
  const normalizedOwner = normalizeRepoSegment("owner", owner);
  const normalizedRepo = normalizeRepoSegment("name", repo);
  return `/repos/${encodeURIComponent(normalizedOwner)}/${encodeURIComponent(normalizedRepo)}`;
}

function buildGitHubApiUrl(pathname) {
  const url = new URL(pathname, GITHUB_API_BASE);

  if (url.origin !== GITHUB_API_BASE.origin) {
    throw new Error(`Refusing to call non-GitHub API origin: ${url.origin}`);
  }

  return url;
}

async function fetchReleaseAssets(owner, repo, releaseId, token) {
  const normalizedReleaseId = normalizeReleaseId(releaseId);
  const repoBasePath = buildGitHubRepoBasePath(owner, repo);
  const url = buildGitHubApiUrl(`${repoBasePath}/releases/${normalizedReleaseId}`);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : undefined,
        method: "GET",
        path: `${url.pathname}${url.search}`,
        headers: {
          Accept: "application/vnd.github+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        });
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const statusCode = response.statusCode || 0;
          const statusMessage = response.statusMessage || "Unknown";

          if (statusCode < 200 || statusCode >= 300) {
            reject(
              new Error(
                `Failed to fetch release ${normalizedReleaseId}: ${statusCode} ${statusMessage}`,
              ),
            );
            return;
          }

          try {
            const release = JSON.parse(body);
            resolve(new Set((release.assets || []).map((asset) => asset.name)));
          } catch (error) {
            reject(
              error instanceof Error
                ? error
                : new Error("Failed to parse GitHub release response."),
            );
          }
        });
        response.on("error", reject);
      },
    );

    request.on("error", reject);
    request.end();
  });
}

function formatMissing(fileName, missingNames) {
  return `${fileName}: ${missingNames.join(", ")}`;
}

export function validateReleaseMetadata({
  manifests,
  uploadedAssetNames,
  tagName,
}) {
  const missing = [];

  for (const manifest of manifests) {
    const referenced = Array.from(
      extractReferencedAssetNames(manifest.content),
    ).filter((name) => !uploadedAssetNames.has(name));

    if (referenced.length > 0) {
      missing.push(formatMissing(manifest.name, referenced));
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Updater metadata references missing release assets for ${tagName}:\n${missing.join("\n")}`,
    );
  }
}

export async function main() {
  for (const name of REQUIRED_ENV) {
    readEnv(name);
  }

  const owner = readEnv("REPO_OWNER");
  const repo = readEnv("REPO_NAME");
  const releaseId = readEnv("RELEASE_ID");
  const tagName = readEnv("TAG_NAME");
  const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
  const manifests = normalizeManifestEntries(await readJsonFromStdin());
  const uploadedAssetNames = await fetchReleaseAssets(owner, repo, releaseId, token);

  validateReleaseMetadata({ manifests, uploadedAssetNames, tagName });
  console.log(
    `Validated updater metadata against uploaded release assets for ${tagName}.`,
  );
}

async function runCli() {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (
  (process.argv[1] || "")
    .replaceAll("\\", "/")
    .endsWith("/validate-update-metadata.mjs")
) {
  await runCli();
}
