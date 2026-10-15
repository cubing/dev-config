import { ErgonomicDate } from "ergonomic-date";
import { Path } from "path-class";
import { PrintableShellCommand } from "printable-shell-command";

interface EmbeddedVersionInfo {
  version: string;
  gitHEADHash: string;
  timestamp: string;
}

/** This must be run from a repo root. */
let cachedInfo: Promise<EmbeddedVersionInfo> | undefined;
export async function versionInfo() {
  // biome-ignore lint/suspicious/noAssignInExpressions: https://github.com/biomejs/biome/discussions/7592
  return (cachedInfo ??= (async () => {
    const timestamp = new ErgonomicDate().multipurposeTimestamp;
    const gitHEADHash = (
      await new PrintableShellCommand("git", ["rev-parse", "HEAD"]).text()
    ).trim();
    const { version } = await new Path("./package.json").readJSON<{
      version?: string;
    }>();
    if (!version) {
      throw new Error(
        "Could not compute version from `package.json` in the current dir.",
      );
    }
    return {
      version,
      gitHEADHash: gitHEADHash,
      timestamp,
    };
  })());
}

export async function versionConstantDefinition(): Promise<
  Record<string, string>
> {
  return {
    "globalThis.DEV_CONFIG_EMBEDDED_VERSION_INFO": JSON.stringify(
      await versionInfo(),
    ),
  };
}

// // TODO: support inferring prefix from `package.json`?
export async function versionString(
  commitURLPrefix: string,
  info?: EmbeddedVersionInfo,
): Promise<string> {
  const { version, gitHEADHash, timestamp } = info ?? (await versionInfo());
  return `${version} ${commitURLPrefix}${gitHEADHash} (run or built at ${timestamp}`;
}

declare global {
  var DEV_CONFIG_EMBEDDED_VERSION_INFO: EmbeddedVersionInfo | undefined;
}
