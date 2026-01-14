import { CLICommandArg } from "./args.js";
import { CLIBaseCommand } from "./command.js";
import { CLICMDExecEnvSpec } from "./types.js";

export class CLIUtils {

    static isValidCommandName(name: string): boolean {
        // Command names should not contain spaces or special characters or be empty
        const commandNameRegex = /^[a-zA-Z0-9-_]+$/;
        return commandNameRegex.test(name);
    }

    static canRunInCurrentEnvironment(currentENV: CLICMDExecEnvSpec, cmd: { allowedEnvironment: CLICMDExecEnvSpec }): boolean {
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

    static generateUsageByArgSpec(argSpec: CLICommandArg.ArgSpecDefault, insertSpaceBeforeIfNotEmpty = false): string {

        const parts: string[] = [];

        let veradicPart: string | null = null;

        for (const arg of argSpec.args) {
            if ((arg as any).variadic) {
                // add at end
                veradicPart = (arg as any).required ? `<${arg.name}...>` : `[${arg.name}...]`;
            } else {
                parts.push((arg as any).required ? `<${arg.name}>` : `[${arg.name}]`);
            }
        }

        for (const flag of argSpec.flags) {
            const flagPart = (flag as any).shortName ? `--${flag.name}|-${(flag as any).shortName}` : `--${flag.name}`;

            parts.push((flag as any).required ? `${flagPart} <value>` : `[${flagPart} <value>]`);
        }

        if (veradicPart) {
            parts.push(veradicPart);
        }
        if (insertSpaceBeforeIfNotEmpty && parts.length > 0) {
            return " " + parts.join(" ");
        }
        return parts.join(" ");
    }

}
