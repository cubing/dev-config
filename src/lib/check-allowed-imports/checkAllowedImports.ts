import {
  type BuildOptions,
  build,
  type ImportKind,
  type Metafile,
  type Plugin,
} from "esbuild";
import { Path } from "path-class";
import { es2022Lib } from "../../esbuild/es2022";

/**
 * Note:
 * - A file may be matched by any parent path scope key.
 * - Files in a given scope key are allowed to import any other within the same scope.
 */
export type AllowedImports = {
  [scope: string]: { static?: string[]; dynamic?: string[] };
};

const plugin = {
  name: "mark-bare-imports-as-external",
  setup(build) {
    const filter = /^[^./]|^\.[^./]|^\.\.[^/]/; // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
} satisfies Plugin;

export async function checkAllowedImports(
  groups: {
    [description: string]: {
      entryPoints: string[];
      allowedImports: AllowedImports;
    };
  },
  options?: { overrideEsbuildOptions: BuildOptions },
): Promise<void> {
  let failure = false;

  console.log("+ means a new file");
  console.log("- means a valid import for that file");

  for (const [description, { entryPoints, allowedImports }] of Object.entries(
    groups,
  )) {
    console.log(`# ${description}`);
    // From https://github.com/evanw/esbuild/issues/619#issuecomment-1504100390

    const { metafile } = await build({
      ...es2022Lib(),
      entryPoints,
      plugins: [plugin],
      ...options?.overrideEsbuildOptions,
      // Bogus `outdir` to avoid an error.
      outdir: (await Path.makeTempDir()).path,
      write: false,
      metafile: true,
    });

    // Starts with the path and then keeps chopping off from the right.
    function* pathPrefixes(path: string) {
      const pathParts = path.split("/");
      for (let n = pathParts.length; n > 0; n--) {
        yield pathParts.slice(0, n).join("/");
      }
    }

    function matchingPathPrefix(matchPrefixes: string[], path: string) {
      for (const pathPrefix of pathPrefixes(path)) {
        if (matchPrefixes.includes(pathPrefix)) {
          return pathPrefix;
        }
      }
      return false;
    }

    const importKindMap: Partial<Record<ImportKind, "static" | "dynamic">> = {
      "import-statement": "static",
      "dynamic-import": "dynamic",
    } as const;

    function checkImport(
      sourcePath: string,
      importInfo: {
        path: string;
        kind: ImportKind;
        external?: boolean;
        original?: string;
      },
      allowedImports: AllowedImports,
    ) {
      const importKind = importKindMap[importInfo.kind];
      if (!importKind) {
        throw new Error("Unexpected import kind!");
      }
      for (const sourcePathPrefix of pathPrefixes(sourcePath)) {
        const matchingSourcePathPrefix = matchingPathPrefix(
          Object.keys(allowedImports),
          sourcePathPrefix,
        );
        if (matchingSourcePathPrefix) {
          const allowedImportsForKind =
            allowedImports[matchingSourcePathPrefix][importKind];
          if (
            typeof allowedImportsForKind !== "undefined" &&
            !Array.isArray(allowedImportsForKind)
          ) {
            throw new Error(
              `Expected a string list for ${importKind} imports under the scope "${matchingSourcePathPrefix}"`,
            );
          }
          if (
            matchingPathPrefix(
              [
                matchingSourcePathPrefix, // allow importing from any source group to itself.
                ...(allowedImportsForKind ?? []),
              ],
              importInfo.path,
            )
          ) {
            process.stdout.write("-");
            return;
          }
        }
      }
      failure = true;
      console.error(`\n❌ File has disallowed ${importKind} import:`);
      console.error(`From file: ${sourcePath}`);
      console.error(`Importing: ${importInfo.path}`);
    }

    async function checkImports(
      metafile: Metafile,
      allowedImports: AllowedImports,
    ) {
      for (const [filePath, importInfoList] of Object.entries(
        metafile.inputs,
      )) {
        process.stdout.write("+");
        for (const importInfo of importInfoList.imports) {
          checkImport(filePath, importInfo, allowedImports);
        }
      }
      console.log();
    }

    await checkImports(metafile, allowedImports);
    console.log("");
  }

  if (failure) {
    throw new Error("Failure");
  }
}
