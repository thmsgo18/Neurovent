export function normalizeTopicName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^#/, "");
}

export function canonicalizeTopicName(value) {
  return normalizeTopicName(value)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function topicTokenFromName(value) {
  const slug = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? `#${slug}` : "#";
}

export function getActiveTopicQuery(input) {
  const trimmed = String(input || "").replace(/\s+$/, "");
  const match = trimmed.match(/(?:^|\s)#([^\s#]*)$/);
  return match ? match[1] : null;
}

export function stripTopicTokensFromQuery(input) {
  return String(input || "")
    .replace(/(^|\s)#[^\s#]*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getTopicSuggestions(tags, input, limit = 6) {
  const topicQuery = getActiveTopicQuery(input);
  if (topicQuery === null) return [];

  const normalizedQuery = canonicalizeTopicName(topicQuery);
  const selectedTokens = new Set(extractTopicTokens(input));
  const ranked = [...(tags || [])].sort((left, right) => {
    const leftName = canonicalizeTopicName(left.name);
    const rightName = canonicalizeTopicName(right.name);

    if (!normalizedQuery) return leftName.localeCompare(rightName);

    const leftStarts = leftName.startsWith(normalizedQuery) ? 0 : 1;
    const rightStarts = rightName.startsWith(normalizedQuery) ? 0 : 1;
    if (leftStarts !== rightStarts) return leftStarts - rightStarts;

    const leftIndex = leftName.indexOf(normalizedQuery);
    const rightIndex = rightName.indexOf(normalizedQuery);
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;

    return leftName.localeCompare(rightName);
  });

  return ranked
    .filter((tag) => {
      const canonicalName = canonicalizeTopicName(tag.name);
      if (selectedTokens.has(canonicalName)) return false;
      if (!normalizedQuery) return true;
      return canonicalName.includes(normalizedQuery);
    })
    .slice(0, limit);
}

export function extractTopicTokens(input) {
  const matches = String(input || "").match(/(^|\s)#[^\s#]+/g) || [];
  const seen = new Set();

  return matches
    .map((match) => canonicalizeTopicName(match))
    .filter((token) => {
      if (!token || seen.has(token)) return false;
      seen.add(token);
      return true;
    });
}

export function getMatchingTopics(tags, input) {
  const tokens = extractTopicTokens(input);
  if (!tokens.length) return [];

  return (tags || []).filter((tag) => tokens.includes(canonicalizeTopicName(tag.name)));
}

export function getMatchingTopicIds(tags, input) {
  return getMatchingTopics(tags, input).map((tag) => tag.id);
}

export function stripMatchingTopicTokens(tags, input) {
  const matchedTopics = getMatchingTopics(tags, input);
  let nextValue = String(input || "");

  matchedTopics.forEach((tag) => {
    const token = topicTokenFromName(tag.name);
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    nextValue = nextValue.replace(new RegExp(`(^|\\s)${escapedToken}(?=\\s|$)`, "i"), " ");
  });

  return nextValue.replace(/\s{2,}/g, " ").trim();
}

export function mergeTopicTokensWithText(tags, input, text) {
  const topicTokens = getMatchingTopics(tags, input).map((tag) => topicTokenFromName(tag.name));
  const nextText = String(text || "").replace(/\s+/g, " ").trim();
  return [...topicTokens, nextText].filter(Boolean).join(" ").trim();
}

export function applyTopicSuggestion(input, topicName) {
  const token = topicTokenFromName(topicName);
  const current = String(input || "");

  if (/(?:^|\s)#[^\s#]*$/.test(current)) {
    return (
      current
        .replace(/(?:^|\s)#[^\s#]*$/, (match) => `${match.startsWith(" ") ? " " : ""}${token}`)
        .replace(/\s{2,}/g, " ")
        .trim() + " "
    );
  }

  const separator = current.trim() ? " " : "";
  return `${current.trim()}${separator}${token} `.trimStart();
}

export function toggleTopicSuggestion(input, topicName) {
  const token = topicTokenFromName(topicName);
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\s)${escapedToken}(?=\\s|$)`, "i");
  const current = String(input || "");

  if (pattern.test(current)) {
    return current
      .replace(pattern, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  const separator = current.trim() ? " " : "";
  return `${current.trim()}${separator}${token}`.trim();
}
