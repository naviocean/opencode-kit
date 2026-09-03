/**
 * Context Marker Utilities
 *
 * Injects and updates content bounded by marker comments:
 * <!-- <markerId>:start -->
 * ...content...
 * <!-- <markerId>:end -->
 */

const DEFAULT_MARKER_ID = 'opencode-saas-kit';

function wrapWithMarkers(content, markerId = DEFAULT_MARKER_ID) {
  const trimmed = content.trim();
  if (hasMarkers(trimmed, markerId)) {
    return trimmed;
  }
  return `<!-- ${markerId}:start -->\n${trimmed}\n<!-- ${markerId}:end -->`;
}

function hasMarkers(text, markerId = DEFAULT_MARKER_ID) {
  if (!text) return false;
  const startTag = `<!-- ${markerId}:start -->`;
  const endTag = `<!-- ${markerId}:end -->`;
  return text.includes(startTag) && text.includes(endTag);
}

function extractMarkedContent(text, markerId = DEFAULT_MARKER_ID) {
  if (!hasMarkers(text, markerId)) return null;
  const startTag = `<!-- ${markerId}:start -->`;
  const endTag = `<!-- ${markerId}:end -->`;
  const startIndex = text.indexOf(startTag) + startTag.length;
  const endIndex = text.indexOf(endTag);
  if (startIndex > endIndex) return null;
  return text.slice(startIndex, endIndex).trim();
}

/**
 * Injects or updates marked content inside existing text.
 * - If markers exist: replaces only the block between markers.
 * - If no markers exist:
 *   - If existing text has content: prepends (or appends) the marked block, preserving existing text.
 *   - If existing text is empty: returns wrapped content.
 */
function injectMarkedContent(existingText, newContent, options = {}) {
  const markerId = options.markerId || DEFAULT_MARKER_ID;
  const position = options.position || 'prepend'; // 'prepend' | 'append'
  const wrapped = wrapWithMarkers(newContent, markerId);

  if (!existingText || !existingText.trim()) {
    return wrapped + '\n';
  }

  const startTag = `<!-- ${markerId}:start -->`;
  const endTag = `<!-- ${markerId}:end -->`;

  if (hasMarkers(existingText, markerId)) {
    const startIndex = existingText.indexOf(startTag);
    const endIndex = existingText.indexOf(endTag) + endTag.length;
    const before = existingText.slice(0, startIndex).trimEnd();
    const after = existingText.slice(endIndex).trimStart();

    const parts = [];
    if (before) parts.push(before);
    parts.push(wrapped);
    if (after) parts.push(after);

    return parts.join('\n\n') + '\n';
  }

  // No markers yet: preserve all existing human content
  if (position === 'append') {
    return existingText.trimEnd() + '\n\n' + wrapped + '\n';
  } else {
    return wrapped + '\n\n' + existingText.trimStart();
  }
}

module.exports = {
  DEFAULT_MARKER_ID,
  wrapWithMarkers,
  hasMarkers,
  extractMarkedContent,
  injectMarkedContent,
};
