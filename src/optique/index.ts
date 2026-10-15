import { argv } from "node:process";
import type { RunOptions } from "@optique/run";
import { Path } from "path-class";

export function runByOption(versionString: string): RunOptions {
  return {
    programName: new Path(argv[1]).basename.path,
    help: "option",
    completion: {
      option: {
        names: ["--completions"],
        hidden: false,
      },
    },
    version: {
      option: {
        hidden: false,
      },
      value: versionString,
    },
  };
}

export function runBySubcommand(versionString: string): RunOptions {
  return {
    programName: new Path(argv[1]).basename.path,
    help: "command",
    completion: { command: { names: ["completions"], hidden: false } },
    version: {
      command: { hidden: false },
      value: versionString,
    },
  };
}
