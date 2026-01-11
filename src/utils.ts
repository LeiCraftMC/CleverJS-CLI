import { CLIBaseCommand } from "./command.js";
import { CLICMDExecEnvSpec } from "./types.js";

export class CLIUtils {

    static canRunInCurrentEnvironment(currentENV: CLICMDExecEnvSpec, cmd: CLIBaseCommand) {
        if (cmd.allowedEnvironment === "all") return true;
        if (currentENV === "shell") {
            return cmd.allowedEnvironment === "shell";
        }
        return cmd.allowedEnvironment === "runtime";
    }

    static parseParentArgs(parent_args: string[], appendSpaceIFNotEmpty = false): string {
        let parent_args_str = parent_args.join(" ");
        if (appendSpaceIFNotEmpty && parent_args_str) {
            parent_args_str += " ";
        }
        return parent_args_str;
    }

}

export namespace Utils {

    export function splitStrNTimes(str: string, delim: string, count: number) {
        const parts = str.split(delim);
        const tail = parts.slice(count).join(delim);
        const result = parts.slice(0,count);
        if (tail) result.push(tail);
        return result;
    }

}