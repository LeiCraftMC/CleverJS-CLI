import { CLICommandArg } from "./args.js";
import { CLIBaseCommand } from "./command.js";
import { CLICMDExecEnvSpec } from "./types.js";

export class CLIUtils {

    static isValidCommandName(name: string): boolean {
        // Command names should not contain spaces or special characters or be empty
        const commandNameRegex = /^[a-zA-Z0-9-_]+$/;
        return commandNameRegex.test(name);
    }

    static canRunInCurrentEnvironment(currentENV: CLICMDExecEnvSpec, cmd: CLIBaseCommand.ICommand<CLICommandArg.ArgSpecDefault>): boolean {
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

    static splitStrNTimes(str: string, delim: string, count: number) {
        const parts = str.split(delim);
        const tail = parts.slice(count).join(delim);
        const result = parts.slice(0,count);
        if (tail) result.push(tail);
        return result;
    }

}