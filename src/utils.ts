import { CLICMD } from "./command.js";
import { CLICMDExecEnvSpec } from "./types.js";

export class CLIUtils {

    static canRunInCurrentEnvironment(currentENV: CLICMDExecEnvSpec, cmd: CLICMD) {
        if (cmd.environment === "all") return true;
        if (currentENV === "shell") {
            return cmd.environment === "shell";
        }
        return cmd.environment === "runtime";
    }

    static parsePArgs(parent_args: string[], appendSpaceIFNotEmpty = false): string {
        let parent_args_str = parent_args.join(" ");
        if (appendSpaceIFNotEmpty && parent_args_str) {
            parent_args_str += " ";
        }
        return parent_args_str;
    }

    static invalidNumberOfArguments(): void {
        //cli.cmd.info("Invalid number of arguments!");
    }

}

export function splitStrNTimes(str: string, delim: string, count: number) {
    const parts = str.split(delim);
    const tail = parts.slice(count).join(delim);
    const result = parts.slice(0,count);
    if (tail) result.push(tail);
    return result;
}
