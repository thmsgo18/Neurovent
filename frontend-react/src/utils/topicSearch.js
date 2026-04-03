export function normalizeTopicName(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^#/, "");
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

  const normalizedQuery = normalizeTopicName(topicQuery);
  const ranked = [...(tags || [])].sort((left, right) => {
    const leftName = normalizeTopicName(left.name);
    const rightName = normalizeTopicName(right.name);

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
      if (!normalizedQuery) return true;
      return normalizeTopicName(tag.name).includes(normalizedQuery);
    })
    .slice(0, limit);
}

export function applyTopicSuggestion(input) {
  return String(input || "")
    .replace(/(?:^|\s)#[^\s#]*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
