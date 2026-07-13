import fs from "fs";
import path from "path";

const TEMPLATES_DIR = path.join(process.cwd(), "lib", "emails", "templates");

/**
 * Minimal renderer for Resend-style triple-brace templates.
 * Handles:
 *   {{{variable}}}              → variable substitution
 *   {{{#if var}}}...{{{/if}}}  → conditional blocks
 *   {{{#if var}}}...{{{else}}}...{{{/if}}} → conditional with else
 *
 * Nested ifs are resolved innermost-first via iteration.
 */
export function renderEmailTemplate(
  templateName: string,
  variables: Record<string, string>
): string {
  const filePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return renderHtml(raw, variables);
}

export function renderHtml(
  html: string,
  variables: Record<string, string>
): string {
  let result = html;

  // Resolve if/else blocks iteratively to handle nesting (innermost first).
  // The negative lookahead (?!\{\{\{#if\s) ensures we match only blocks that
  // don't contain a nested {{{#if inside them.
  const IF_PATTERN =
    /\{\{\{#if\s+(\w+)\}\}\}((?:(?!\{\{\{#if\s)[\s\S])*?)\{\{\{\/if\}\}\}/g;

  let prev = "";
  while (prev !== result) {
    prev = result;
    result = result.replace(IF_PATTERN, (_, varName: string, content: string) => {
      const value = variables[varName];
      const truthy = value !== undefined && value !== "" && value !== "false";
      const elseMarker = "{{{else}}}";
      const elseIdx = content.indexOf(elseMarker);
      if (truthy) {
        return elseIdx >= 0 ? content.slice(0, elseIdx) : content;
      }
      return elseIdx >= 0 ? content.slice(elseIdx + elseMarker.length) : "";
    });
  }

  // Replace output variables {{{variable_name}}}
  result = result.replace(/\{\{\{(\w+)\}\}\}/g, (_: string, varName: string) => {
    return variables[varName] ?? "";
  });

  return result;
}
