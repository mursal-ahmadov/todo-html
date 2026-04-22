/**
 * Markdown rendering with DOMPurify-style sanitization.
 * Uses marked.js from CDN (loaded via import map).
 * @module features/markdown
 */

import { marked } from "marked";

// Configure marked for safe output
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Sanitize HTML to prevent XSS.
 * Only allows a safe subset of tags and attributes.
 * @param {string} html
 * @returns {string}
 */
function sanitize(html) {
  const ALLOWED_TAGS = new Set([
    "p","br","strong","em","s","code","pre","blockquote",
    "h1","h2","h3","h4","h5","h6",
    "ul","ol","li","a","img",
    "hr","table","thead","tbody","tr","th","td",
    "input",
  ]);
  const ALLOWED_ATTRS = new Set(["href","src","alt","title","class","type","checked","disabled"]);

  const template = document.createElement("template");
  template.innerHTML = html;

  const walk = (node) => {
    const remove = [];
    for (const child of node.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)) {
          remove.push(child);
          continue;
        }
        // Remove disallowed attributes
        for (const attr of Array.from(child.attributes)) {
          if (!ALLOWED_ATTRS.has(attr.name)) {
            child.removeAttribute(attr.name);
          }
        }
        // Sanitize hrefs (no javascript:)
        if (child.hasAttribute("href")) {
          const href = child.getAttribute("href");
          if (/^javascript:/i.test(href)) child.removeAttribute("href");
        }
        // Open links in new tab safely
        if (tag === "a") {
          child.setAttribute("rel", "noopener noreferrer");
          child.setAttribute("target", "_blank");
        }
        walk(child);
      }
    }
    for (const n of remove) node.removeChild(n);
  };

  walk(template.content);
  return template.innerHTML;
}

/**
 * Render markdown text to sanitized HTML string.
 * @param {string} md
 * @returns {string}
 */
export function renderMarkdown(md) {
  if (!md) return "";
  const rawHtml = marked.parse(md);
  return sanitize(rawHtml);
}

/**
 * Render markdown into a target DOM element safely.
 * @param {HTMLElement} target
 * @param {string} md
 */
export function renderMarkdownInto(target, md) {
  target.innerHTML = renderMarkdown(md);
}
