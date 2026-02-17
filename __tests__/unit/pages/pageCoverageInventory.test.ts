import path from "node:path";
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAGE_TEMPLATES } from "@/__tests__/shared/pageCoverage";

function collectPageTemplates(
  absoluteDir: string,
  relativeSegments: string[] = []
): string[] {
  const templates: string[] = [];
  const entries = readdirSync(absoluteDir, { withFileTypes: true });

  for (const entry of entries) {
    const nextAbsolute = path.join(absoluteDir, entry.name);
    const nextRelative = [...relativeSegments, entry.name];

    if (entry.isDirectory()) {
      templates.push(...collectPageTemplates(nextAbsolute, nextRelative));
      continue;
    }

    if (!entry.isFile() || entry.name !== "page.tsx") {
      continue;
    }

    const segmentsWithoutFile = nextRelative.slice(0, -1);
    templates.push(
      segmentsWithoutFile.length === 0 ? "/" : `/${segmentsWithoutFile.join("/")}`
    );
  }

  return templates;
}

describe("page coverage inventory", () => {
  it("tracks every app/**/page.tsx template in PAGE_COVERAGE", () => {
    const appDir = path.resolve(process.cwd(), "app");
    const discoveredTemplates = collectPageTemplates(appDir).sort();
    const definedTemplates = [...PAGE_TEMPLATES].sort();

    expect(discoveredTemplates).toEqual(definedTemplates);
  });
});
