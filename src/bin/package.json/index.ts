#!/usr/bin/env -S bun run --

/** biome-ignore-all lint/complexity/useLiteralKeys: https://github.com/biomejs/biome/discussions/7404 */

import assert from "node:assert";
import { constants } from "node:fs/promises";
import { argv, exit } from "node:process";
import type { JSONSchemaForNPMPackageJsonFiles } from "@schemastore/package";
import { semver } from "bun";
import { Path, ResolutionPrefix, stringifyIfPath } from "path-class";
import { PrintableShellCommand } from "printable-shell-command";

// Licenses from https://github.com/cubing/infra?tab=readme-ov-file#conventions
const PERMITTED_LICENSES = new Set([
  "MPL-2.0",
  "MIT",
  "Unlicense",
  "GPL-3.0-or-later",
]);

// TODO: proper CLI parsing once this gets more complicated.
const subcommand: "check" | "format" = (() => {
  const subcommand = argv[2];
  if (!["check", "format"].includes(subcommand)) {
    console.error("Must specify subcommand: `check` or `format`");
    exit(1);
  }
  return subcommand as "check" | "format";
})();

let exitCode: number = 0;
let foundFixableErrors: boolean = false;

const PACKAGE_JSON_PATH = new Path("./package.json");

/*

Note: this checker is opinionated, and does not allow certain patterns.

It also assumes certain conventions about package structure and maintenance.

*/

// TODO: Schema validation.

console.log("Parsing `package.json`:");
const packageJSONString = await PACKAGE_JSON_PATH.readText();
let packageJSON: JSONSchemaForNPMPackageJsonFiles = (() => {
  try {
    const packageJSON: JSONSchemaForNPMPackageJsonFiles =
      JSON.parse(packageJSONString);
    console.log("✅ `package.json` is valid JSON.");
    return packageJSON;
  } catch {
    console.log(
      "❌ `package.json` must be valid JSON (not JSONC or JSON5 or anything else).",
    );
    exit(1);
  }
})();

console.log("Checking field order:");
const opinionatedFieldOrder = [
  "name",
  "version",
  "homepage",
  "description",
  "author",
  "license",
  "repository",
  "engines",
  "os",
  "cpu",
  "type",
  "main",
  "types",
  "module",
  "browser",
  "exports",
  "bin",
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "bundleDependencies",
  "devEngines",
  "files",
  "scripts",
  "keywords",
  "@cubing/deploy",
  "$schema",
] as const;
const opinionatedFields = new Set(opinionatedFieldOrder);

const packageJSONOrder: string[] = [];
for (const key in packageJSON) {
  // biome-ignore lint/suspicious/noExplicitAny: Type wrangling
  if (opinionatedFields.has(key as any)) {
    packageJSONOrder.push(key);
  } else {
    console.warn(`⚠️ [${JSON.stringify(key)}] Unexpected field.`);
  }
}
const packageJSONByOpinionatedOrder: string[] = [];
for (const field of opinionatedFieldOrder) {
  if (field in packageJSON) {
    packageJSONByOpinionatedOrder.push(field);
  }
}

try {
  assert.deepEqual(packageJSONOrder, packageJSONByOpinionatedOrder);
  console.log(`✅ Field order is good.`);
} catch {
  switch (subcommand) {
    case "check": {
      console.log(`❌ Found opinionated fields out of order:`);
      console.log(`↤ ${packageJSONOrder.join(", ")}`);
      console.log("Expected:");
      console.log(`↦ ${packageJSONByOpinionatedOrder.join(", ")}`);
      console.log(
        "📝 Run with the `sort` subcommand to sort. (Additional fields will kept after the field they previously followed.)",
      );
      foundFixableErrors = true;
      exitCode = 1;
      break;
    }
    case "format": {
      console.log("📝 Invalid field order. Formatting…");
      exitCode = 1;
      const newKeyOrder: string[] = [];
      for (const key of packageJSONByOpinionatedOrder) {
        newKeyOrder.push(key);
      }
      for (const { value: key, previous } of withOrderingMetadata(
        Object.keys(packageJSON),
      )) {
        if (newKeyOrder.includes(key)) {
          continue;
        }
        if (!previous) {
          newKeyOrder.unshift(key);
        } else {
          const { value: previousKey } = previous;
          const idx = newKeyOrder.indexOf(previousKey);
          newKeyOrder.splice(idx + 1, 0, key);
        }
      }
      const newPackageJSON: JSONSchemaForNPMPackageJsonFiles = {};
      for (const key of newKeyOrder) {
        newPackageJSON[key] = packageJSON[key];
      }
      packageJSON = newPackageJSON;
      break;
    }
    default:
      throw new Error("Invalid subcommand.") as never;
  }
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#description
type TypeOfType =
  | "undefined"
  | "object"
  | "boolean"
  | "number"
  | "bigint"
  | "string"
  | "symbol"
  | "function"
  | "object";
type Categorization = "array" | "null" | TypeOfType;
// biome-ignore lint/suspicious/noExplicitAny: `any` is correct.
function categorize(v: any): Categorization {
  if (Array.isArray(v)) {
    return "array";
  }
  if (v === null) {
    return "null";
  }
  return typeof v;
}

interface OrderingMetadata<T> {
  value: T;
  previous: { value: T } | null;
  isLast: boolean;
}
function* withOrderingMetadata<T>(
  iter: Iterable<T>,
): Iterable<OrderingMetadata<T>> {
  // The following functions as an `Option<T>`, even when `T` is undefined.
  let previous: [OrderingMetadata<T>] | undefined;
  for (const value of iter) {
    if (previous) {
      yield previous[0];
      previous = [
        { value, previous: { value: previous[0].value }, isLast: false },
      ];
    } else {
      previous = [{ value, previous: null, isLast: false }];
    }
  }
  if (previous) {
    yield { ...previous[0], isLast: true };
  }
}
type Breadcrumbs = (string | [string] | number)[];
function traverse<T>(
  breadcrumbs: Breadcrumbs,
  options?: { set?: T },
): {
  breadcrumbString: string;
  maybeValue: [T] | null;
} {
  assert(breadcrumbs.length > 0);
  // biome-ignore lint/suspicious/noExplicitAny: Type wrangling
  let maybeValue: [T | any] | null = [packageJSON];
  let breadcrumbString = "";
  for (let { value: breadcrumb, isLast } of withOrderingMetadata(breadcrumbs)) {
    if (Array.isArray(breadcrumb)) {
      assert(breadcrumb.length === 1);
      assert(typeof breadcrumb[0] === "string");
      breadcrumb = breadcrumb[0];
      breadcrumbString += `[${JSON.stringify(breadcrumb)}]`;
    } else if (typeof breadcrumb === "string") {
      breadcrumbString += `.${breadcrumb}`;
    } else {
      breadcrumbString += `[${breadcrumb}]`;
    }
    if (options && "set" in options && isLast) {
      if (
        !maybeValue ||
        !["array", "object"].includes(categorize(maybeValue[0]))
      ) {
        // This okay for now, because we currently only write to values we have read.
        throw new Error(
          "Missing (but expected) traversal path while setting a value",
        ) as never;
      }
      maybeValue[0][breadcrumb] = stringifyIfPath(options.set);
    } else if (
      maybeValue &&
      ["array", "object"].includes(categorize(maybeValue[0])) &&
      breadcrumb in maybeValue[0]
    ) {
      maybeValue = [maybeValue[0][breadcrumb]];
    } else {
      maybeValue = null;
    }
  }
  return { breadcrumbString, maybeValue };
}

function field<T>(
  breadcrumbs: Breadcrumbs,
  type: Categorization | Categorization[],
  options?: {
    optional?: boolean;
    additionalChecks?: { [requirementMessage: string]: (t: T) => boolean };
    skipPrintingSuccess?: boolean;
    mustBePopulatedMessage?: string;
  },
) {
  const mustBePopulatedMessage = () =>
    options?.mustBePopulatedMessage ?? "Field must be populated.";
  const { breadcrumbString, maybeValue } = traverse(breadcrumbs);
  if (!maybeValue) {
    if (options?.optional) {
      if (!options.skipPrintingSuccess) {
        console.log(`☑️ ${breadcrumbString}`);
      }
      return;
    } else {
      console.log(`❌ ${breadcrumbString} — ${mustBePopulatedMessage()}`);
      exitCode = 1;
      return;
    }
  }
  const [value] = maybeValue;

  const typeArray = Array.isArray(type) ? type : [type];
  const category = categorize(value);
  if (typeArray.includes(category)) {
    for (const [failureMessage, fn] of Object.entries(
      options?.additionalChecks ?? {},
    )) {
      if (!fn) {
        console.log(`❌ ${breadcrumbString} | ${failureMessage}`);
        exitCode = 1;
        return;
      }
    }
    if (!options?.skipPrintingSuccess) {
      console.log(`✅ ${breadcrumbString}`);
    }
  } else {
    if (category === "undefined") {
      console.log(`❌ ${breadcrumbString} — ${mustBePopulatedMessage()}.`);
    } else if (type === "undefined") {
      console.log(
        `❌ ${breadcrumbString} — Field is populated (but must not be).`,
      );
    } else {
      if (Array.isArray(type)) {
        console.log(
          `❌ ${breadcrumbString} — Does not match an expected type: ${type.join(", ")}`,
        );
      } else {
        console.log(
          `❌ ${breadcrumbString} — Does not match expected type: ${type}`,
        );
      }
    }
    exitCode = 1;
    return;
  }
}

function mustNotBePopulated(breadcrumbs: Breadcrumbs) {
  const { breadcrumbString, maybeValue } = traverse(breadcrumbs);
  if (maybeValue) {
    console.log(`❌ ${breadcrumbString} — Must not be present.`);
    exitCode = 1;
    return;
  }
}

console.log("Checking presence and type of fields:");

field(["name"], "string");
field(["version"], "string", {
  additionalChecks: {
    "Version must parse successfully.": (version: string) =>
      semver.order(version, version) === 0,
  },
});
field(["homepage"], "string", { optional: true });
field(["description"], "string");
// TODO: format author.
field(["author"], ["string", "object"]);
if (categorize(packageJSON["author"]) === "object") {
  field(["author", "name"], "string");
  field(["author", "email"], "string");
  field(["author", "url"], "string", {
    additionalChecks: {
      "URL must parse.": (url: string) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
    },
  });
}
field(["license"], "string", {
  additionalChecks: {
    "Must contain a non-permitted license.": (license: string) => {
      for (const licenseEntry of license.split(" OR ")) {
        if (!PERMITTED_LICENSES.has(licenseEntry)) {
          return false;
        }
      }
      return true;
    },
  },
});
// TODO: format repo.
field(["repository"], "object");
field(["repository", "type"], "string");
const GIT_URL_PREFIX = "git+";
const GIT_URL_SUFFIX = ".";
field(["repository", "url"], "string", {
  additionalChecks: {
    [`URL must be prefixed with \`${GIT_URL_PREFIX}\`.`]: (url: string) =>
      url.startsWith(GIT_URL_PREFIX),
    [`URL must end with with \`.${GIT_URL_SUFFIX}\`.`]: (url: string) =>
      url.endsWith(GIT_URL_SUFFIX),
    "URL must parse.": (url: string) => {
      try {
        new URL(url.slice());
        return true;
      } catch {
        return false;
      }
    },
  },
});
// TODO: Validate version range syntax.
field(["engines"], "object", { optional: true });
field(["os"], "array", { optional: true });
field(["cpu"], "array", { optional: true });
field(["type"], "string", {
  additionalChecks: {
    'Type must be `"module"`.': (type: string) => type === "module",
  },
});
const mainOrTypesArePopoulated = (() => {
  if ("types" in packageJSON) {
    field(["main"], "string", {
      mustBePopulatedMessage: "Must be populated if `.types` is populated.",
    });
    field(["types"], "string");
    return true;
  } else if ("main" in packageJSON) {
    field(["main"], "string", {});
    if (packageJSON["main"]?.endsWith(".js")) {
      field(["types"], "string", {
        mustBePopulatedMessage:
          "Must be populated if `.main` is with a path ending in `.js`.",
      });
    } else {
      console.log("☑️ .types");
    }
    return true;
  } else {
    console.log("☑️ .main");
    console.log("☑️ .types");
    return false;
  }
})();
mustNotBePopulated(["module"]);
mustNotBePopulated(["browser"]);
field(["exports"], "object", {
  optional: !mainOrTypesArePopoulated,
  mustBePopulatedMessage:
    "Must be populated if `.main` or `.types` are populated.",
});
field(["bin"], "object", { optional: true });
field(["dependencies"], "object", { optional: true });
field(["devDependencies"], "object", { optional: true });
field(["optionalDependencies"], "object", { optional: true });
field(["peerDependencies"], "object", { optional: true });
field(["bundleDependencies"], "object", { optional: true });
field(["devEngines"], "object", { optional: true });
// TODO: check for path resolution prefix?
// Set to `["*"]` if needed.
field(["files"], "array");
field(["scripts"], "object");
// Set to `"# no-op"` if needed.
field(["scripts", "prepublishOnly"], "string");

console.log("Checking paths of binaries and exports:");

const tempDir = await Path.makeTempDir();
await using tempDirDisposable = {
  [Symbol.asyncDispose]: async () => {
    console.log("Disposing temporary dir.");
    await tempDir.rm_rf();
  },
};
const extractionDir = await tempDir.join("extracted").mkdir();
// TODO: is there a 100% reliable way to test against paths that *will* be packed?
// Note that this has to take into account `.gitignore`, `.npmignore`, and `"files"` — with globs and excludes.
// For now, we print the command to make it clear that some heavy lifting is going on (and that it's not our fault that it's slow).
const data: { filename: string }[] = await new PrintableShellCommand("npm", [
  "pack",
  "--json",
  "--ignore-scripts",
  ["--pack-destination", tempDir],
])
  .print()
  .json();
const tgzPath = tempDir.join(data[0].filename);
await new PrintableShellCommand("tar", [
  ["-C", extractionDir],
  ["-xvzf", tgzPath],
]).spawn().success;

const extractedRoot = extractionDir.join("package/");
assert(await extractedRoot.existsAsDir());

const checks: Promise<string>[] = [];

// TODO: check compilability
function checkPath(
  breadcrumbs: Breadcrumbs,
  options: { expectPrefix: ResolutionPrefix; mustBeExecutable?: true },
) {
  const { breadcrumbString, maybeValue } = traverse(breadcrumbs);
  if (!maybeValue) {
    return;
  }
  const [value] = maybeValue;
  checks.push(
    (async () => {
      if (typeof value !== "string") {
        exitCode = 1;
        return `❌ ${breadcrumbString} — Non-string value`;
      }
      if (value.includes("*")) {
        return `⏭️ ${breadcrumbString} — Skipping due to glob (*) — ${value}`;
      }
      const unresolvedPath = new Path(value);
      if (unresolvedPath.resolutionPrefix !== options.expectPrefix) {
        if (unresolvedPath.resolutionPrefix === ResolutionPrefix.Absolute) {
          exitCode = 1;
          return `❌ ${breadcrumbString} — Incorrect resolution prefix (${unresolvedPath.resolutionPrefix}) — ${value}`;
        } else {
          switch (subcommand) {
            case "check": {
              exitCode = 1;
              foundFixableErrors = true;
              return `❌ ${breadcrumbString} — Incorrect resolution prefix (${unresolvedPath.resolutionPrefix}) — 📝 fixable! — ${value}`;
            }
            case "format": {
              console.log(
                `📝 — Incorrect resolution prefix (${unresolvedPath.resolutionPrefix}) — fixing! — ${value}`,
              );
              // TODO: do this calculation before reporting as fixable
              const newPath =
                options.expectPrefix === ResolutionPrefix.Bare
                  ? unresolvedPath.asBare()
                  : unresolvedPath.asRelative();
              traverse(breadcrumbs, { set: newPath });
              break;
            }
            default:
              throw new Error("Invalid subcommand.") as never;
          }
        }
      }
      if (
        unresolvedPath.path.startsWith("../") ||
        unresolvedPath.path === ".."
      ) {
        exitCode = 1;
        return `❌ ${breadcrumbString} — Invalid traversal of parent path. — ${value}`;
      }
      const resolvedPath = Path.resolve(unresolvedPath, extractedRoot);
      // TODO: allow folders (with a required trailing slash)?
      if (!(await resolvedPath.existsAsFile())) {
        exitCode = 1;
        return `❌ ${breadcrumbString} — Path must be present in the package. — ${value}`;
      }
      if (options.mustBeExecutable) {
        if (!((await resolvedPath.stat()).mode ^ constants.X_OK)) {
          // This is not considered fixable because the binary may be the output
          // of a build process. In that case, the build process is responsible
          // for marking it as executable.
          return `❌ ${breadcrumbString} — File at path must be executable. — ${value}`;
        }
      }
      return `✅ ${breadcrumbString} — Path must be present in the package. — ${value}`;
    })(),
  );
}

checkPath(["main"], { expectPrefix: ResolutionPrefix.Relative });
checkPath(["types"], { expectPrefix: ResolutionPrefix.Relative });
checkPath(["module"], { expectPrefix: ResolutionPrefix.Relative });
checkPath(["browser"], { expectPrefix: ResolutionPrefix.Relative });

const { exports } = packageJSON;
if (exports) {
  for (const [subpath, value] of Object.entries(exports)) {
    if (!value) {
      // biome-ignore lint/complexity/noUselessContinue: Explicit control flow.
      continue;
    } else if (typeof value === "string") {
      // TODO: error?
      checkPath(["exports", [subpath]], {
        expectPrefix: ResolutionPrefix.Relative,
      });
    } else if (value === null) {
      // biome-ignore lint/complexity/noUselessContinue: Explicit control flow.
      continue;
    } else if (Array.isArray(value)) {
      throw new Error(
        "❌ .exports — Must use an object (instead of an array).",
      );
    } else {
      const keys = Object.keys(value as Record<string, string>);

      checks.push(
        (async () => {
          const { breadcrumbString } = traverse(["exports", [subpath]]);
          const fixingLines = [];
          const orderingErrorLines = [];
          /**
           * https://nodejs.org/api/packages.html#conditional-exports
           */
          let updateKeys = false;
          if (keys.includes("types")) {
            if (keys[0] !== "types") {
              switch (subcommand) {
                case "check": {
                  orderingErrorLines.push(
                    `  ↪ "types" must be the first export if present — 📝 fixable!`,
                  );
                  break;
                }
                case "format": {
                  fixingLines.push(
                    `  ↪ "types" must be the first export if present — 📝 fixing!`,
                  );
                  keys.splice(keys.indexOf("types"), 1);
                  keys.splice(0, 0, "types");
                  updateKeys = true;
                  break;
                }
                default:
                  throw new Error("Invalid subcommand.") as never;
              }
            }
          }
          if (keys.includes("default")) {
            if (keys.at(-1) !== "default") {
              switch (subcommand) {
                case "check": {
                  orderingErrorLines.push(
                    `  ↪ "default" must be the last export if present — 📝 fixable!`,
                  );
                  break;
                }
                case "format": {
                  fixingLines.push(
                    `  ↪ "default" must be the last export if present — 📝 fixing!`,
                  );
                  keys.splice(keys.indexOf("default"), 1);
                  keys.push("default");
                  updateKeys = true;
                  break;
                }
                default:
                  throw new Error("Invalid subcommand.") as never;
              }
            }
          }
          if (updateKeys) {
            // TODO: avoid type wrangling.
            const newConditionalExports: Record<string, string> = {};
            for (const key of keys) {
              newConditionalExports[key] = (value as Record<string, string>)[
                key
              ];
            }
            (exports as Record<string, Record<string, string>>)[subpath] =
              newConditionalExports;
          }
          for (const key of keys) {
            // Note `"require"` is *emphatically not allowed*.
            if (!["types", "import", "default"].includes(key)) {
              orderingErrorLines.push(
                `  ↪ Key must not be present: ${JSON.stringify(key)}`,
              );
            }
          }
          if (orderingErrorLines.length > 0) {
            exitCode = 1;
            return [
              `❌ ${breadcrumbString} — Invalid keys:`,
              ...orderingErrorLines,
            ].join("\n");
          } else {
            if (fixingLines.length > 0) {
              return [
                `✅ ${breadcrumbString} — Fixing key ordering:`,
                ...fixingLines,
              ].join("\n");
            } else {
              return `✅ ${breadcrumbString} — Key set and ordering is OK.`;
            }
          }
        })(),
      );
      for (const secondaryKey of keys) {
        checkPath(["exports", [subpath], secondaryKey], {
          expectPrefix: ResolutionPrefix.Relative,
        });
      }
    }
  }
}

const { bin } = packageJSON;
if (bin) {
  for (const binEntry of Object.keys(bin as Record<string, string>)) {
    checkPath(["bin", [binEntry]], {
      // `npm pkg fix` prefers bare paths for `bin` entries for some reason. 🤷
      expectPrefix: ResolutionPrefix.Bare,
      // `npm` will technically make binary entry points executable, but we want
      // to enforce that the unpackaged path also is. This is particularly
      // important when the package is linked.
      mustBeExecutable: true,
    });
  }
}

console.log((await Promise.all(checks)).join("\n"));

if (subcommand === "format") {
  console.log("📝 Writing formatting fixes.");
  // TODO: support trailing space in `path-class`.
  await PACKAGE_JSON_PATH.write(`${JSON.stringify(packageJSON, null, "  ")}\n`);
  console.log(PACKAGE_JSON_PATH.path);
  console.log("📝 Running `npm pkg fix`.");
  await new PrintableShellCommand("npm", ["pkg", "fix"])
    .print({ argumentLineWrapping: "inline" })
    .spawn().success;
} else if (foundFixableErrors) {
  console.log();
  console.log(
    "📝 Found fixable errors. Run with the `format` subcommand to fix.",
  );
  console.log();
}

await tempDirDisposable[Symbol.asyncDispose]();

exit(exitCode);
