/// <reference types="node" />
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import type {
  JSXOpeningElement,
  JSXAttribute,
  Identifier,
  JSXIdentifier,
  File,
} from "@babel/types";

/**
 * Invariant: le prop `fillHeight` de MemberList ne doit être transmis que sur
 * le montage desktop de `src/pages/Index.tsx`. Les montages mobile (Sheet) et
 * vocal ne doivent jamais le recevoir, afin d'éviter les débordements de mise
 * en page dues à un `h-full` non contrôlé dans un contexte en flux normal.
 */

const SRC_ROOT = path.resolve(__dirname, "../../../..");

interface MemberListMount {
  file: string;
  line: number;
  hasFillHeight: boolean;
}

function isJSXIdentifierName(
  name: JSXIdentifier | Identifier | string | null | undefined,
  expected: string
): boolean {
  if (!name) return false;
  return typeof name === "string" ? name === expected : name.name === expected;
}

function nodeHasFillHeight(node: JSXOpeningElement): boolean {
  return node.attributes.some((attr) => {
    if (attr.type !== "JSXAttribute") return false;
    const name = (attr.name as JSXIdentifier).name;
    return name === "fillHeight";
  });
}

function extractMountsFromFile(filePath: string): MemberListMount[] {
  const content = fs.readFileSync(filePath, "utf-8");
  let ast: File;
  try {
    ast = parse(content, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      errorRecovery: true,
    });
  } catch {
    return [];
  }

  const mounts: MemberListMount[] = [];

  function visit(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;

    if (
      (n.type === "JSXOpeningElement" || n.type === "JSXSelfClosingElement") &&
      isJSXIdentifierName((n.name as JSXOpeningElement).name, "MemberList")
    ) {
      const element = n as JSXOpeningElement;
      const line = element.loc?.start?.line ?? 0;
      mounts.push({
        file: path.relative(SRC_ROOT, filePath),
        line,
        hasFillHeight: nodeHasFillHeight(element),
      });
    }

    for (const key of Object.keys(n)) {
      const value = n[key];
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value && typeof value === "object") {
        visit(value);
      }
    }
  }

  visit(ast);
  return mounts;
}

function findMounts(): MemberListMount[] {
  const mounts: MemberListMount[] = [];

  function scan(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        scan(fullPath);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) &&
        !entry.name.includes(".test.") &&
        !entry.name.includes(".spec.")
      ) {
        mounts.push(...extractMountsFromFile(fullPath));
      }
    }
  }

  scan(SRC_ROOT);
  return mounts;
}

describe("MemberList fillHeight invariant", () => {
  it("only allows fillHeight on the desktop mount in src/pages/Index.tsx", () => {
    const mounts = findMounts();
    const withFillHeight = mounts.filter((m) => m.hasFillHeight);

    expect(
      withFillHeight,
      `Les montages suivants transmettent fillHeight : ${JSON.stringify(
        withFillHeight.map((m) => `${m.file}:${m.line}`),
        null,
        2
      )}`
    ).toHaveLength(1);

    expect(withFillHeight[0].file).toBe("src/pages/Index.tsx");
  });

  it("lists every mobile/voice MemberList mount without fillHeight", () => {
    const mounts = findMounts();
    const nonDesktopMounts = mounts.filter(
      (m) => !(m.file === "src/pages/Index.tsx" && m.hasFillHeight)
    );

    const offenders = nonDesktopMounts.filter((m) => m.hasFillHeight);

    expect(
      offenders,
      `fillHeight ne doit pas être présent sur les montages mobile/voice : ${JSON.stringify(
        offenders.map((m) => `${m.file}:${m.line}`),
        null,
        2
      )}`
    ).toHaveLength(0);

    // On s'assure que les montages connus sont bien détectés.
    const knownMobileOrVoiceFiles = [
      "src/components/mobile/MobileChannelHeader.tsx",
      "src/components/mobile/VoiceChannelDetailsSheet.tsx",
      "src/components/channels/VoiceChannelView.tsx",
    ];
    for (const file of knownMobileOrVoiceFiles) {
      const found = nonDesktopMounts.some((m) => m.file === file);
      expect(found, `Aucun montage MemberList détecté dans ${file}`).toBe(true);
    }
  });
});
