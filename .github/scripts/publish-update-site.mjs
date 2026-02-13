import {
  basenameFromReference,
  CHANNELS,
  createSiteFiles,
  makeReleaseAssetUrl,
  rewriteManifestSource,
} from "./update-site-lib.mjs";

function ensureManifestEntries(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Expected at least one manifest entry in ${label}.`);
  }

  const manifests = value.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Invalid manifest entry at ${label}[${index}].`);
    }

    const name = String(entry.name || "").trim();
    const content = typeof entry.content === "string" ? entry.content : "";

    if (!name) {
      throw new Error(`Manifest entry at ${label}[${index}] is missing a name.`);
    }
    if (!/\.(ya?ml)$/i.test(name)) {
      throw new Error(`Manifest entry ${name} in ${label} is not a YAML file.`);
    }
    if (!content) {
      throw new Error(`Manifest entry ${name} in ${label} is missing content.`);
    }

    return { name, content };
  });

  const seenNames = new Set();
  for (const manifest of manifests) {
    if (seenNames.has(manifest.name)) {
      throw new Error(`Duplicate metadata filename detected: ${manifest.name}`);
    }
    seenNames.add(manifest.name);
  }

  return manifests.sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeExistingChannels(value) {
  if (!value || typeof value !== "object") {
    throw new Error("existingChannels must be an object keyed by update channel.");
  }

  return Object.fromEntries(
    CHANNELS.map((channel) => {
      const manifests = value[channel] || [];
      if (!Array.isArray(manifests)) {
        throw new Error(`existingChannels.${channel} must be an array.`);
      }

      const normalized = manifests.map((entry, index) => {
        if (!entry || typeof entry !== "object") {
          throw new Error(
            `Invalid manifest entry at existingChannels.${channel}[${index}].`,
          );
        }

        const name = String(entry.name || "").trim();
        const content = typeof entry.content === "string" ? entry.content : "";

        if (!name) {
          throw new Error(
            `Manifest entry at existingChannels.${channel}[${index}] is missing a name.`,
          );
        }
        if (!/\.(ya?ml)$/i.test(name)) {
          throw new Error(
            `Manifest entry ${name} in existingChannels.${channel} is not a YAML file.`,
          );
        }
        if (!content) {
          throw new Error(
            `Manifest entry ${name} in existingChannels.${channel} is missing content.`,
          );
        }

        return { name, content };
      });

      return [channel, normalized.sort((a, b) => a.name.localeCompare(b.name))];
    }),
  );
}

async function readJsonFromStdin() {
  let source = "";
  for await (const chunk of process.stdin) {
    source += chunk;
  }

  if (!source.trim()) {
    throw new Error("Expected publish payload JSON on stdin.");
  }

  return JSON.parse(source);
}

export function publishSiteData(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Publish payload must be an object.");
  }

  const channel = String(payload.channel || "").trim();
  if (!CHANNELS.includes(channel)) {
    throw new Error(`Unsupported channel: ${channel}`);
  }

  const owner = String(payload.owner || "").trim();
  const repo = String(payload.repo || "").trim();
  const tagName = String(payload.tagName || "").trim();

  if (!owner || !repo || !tagName) {
    throw new Error("Publish payload is missing owner, repo, or tagName.");
  }

  const inputManifests = ensureManifestEntries(
    payload.inputManifests,
    "inputManifests",
  );
  const existingChannels = normalizeExistingChannels(payload.existingChannels);
  const rewrittenManifests = inputManifests.map((manifest) => ({
    name: manifest.name,
    content: rewriteManifestSource(manifest.content, (value) => {
      const assetName = basenameFromReference(value);
      if (!assetName) {
        return value;
      }

      return makeReleaseAssetUrl(owner, repo, tagName, assetName);
    }),
  }));

  const channelManifests = {
    ...existingChannels,
    [channel]: rewrittenManifests,
  };

  return {
    channel,
    manifests: rewrittenManifests,
    pages: createSiteFiles({ owner, repo, channelManifests }),
  };
}

export async function main() {
  const payload = await readJsonFromStdin();
  process.stdout.write(JSON.stringify(publishSiteData(payload)));
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
    .endsWith("/publish-update-site.mjs")
) {
  await runCli();
}
