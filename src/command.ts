import { CLIUtils } from "./utils.js";
import { CLICMDAlias, CLICMDExecEnvSpec, CLICMDExecMeta, Dict } from "./types.js";

export abstract class CLICMD {

    readonly abstract name: string;
    readonly abstract description: string;
    readonly abstract usage: string;
    readonly aliases: CLICMDAlias[] = [];
    
    /**
     * The environment in which the command can be executed.
     * 
     * - `all`: The command can be executed in any environment (both shell and runtime).
     * - `runtime`: The command can be executed only in an interactive runtime environment (e.g., a running application with a console).
     * - `shell`: The command can be executed only in a shell environment (e.g., terminal or command prompt).
     */
    readonly environment: CLICMDExecEnvSpec = "all";

    abstract run(args: string[], meta: CLICMDExecMeta): Promise<void>;

}

export abstract class CLISubCMD extends CLICMD {
    
    protected readonly registry: Dict<CLICMD> = {};

    protected constructor() {
        super();
        this.onInit();
    }

    /**
     * This function is called when the CLI app is initialized.
     * You should register all commands here.
     * 
     * Example:
     * ```ts
     * class MyCliApp extends CLIApp {
     *     protected onInit() {
     *         this.register(new VersionCMD());
     *         this.register(new FooCMD());
     *     }
     * }
     */
    protected abstract onInit(): void | Promise<void>;

    protected register(command: CLICMD) {
        this.registry[command.name.toLowerCase()] = command;
        for (const alias of command.aliases) {
            const alias_name = typeof alias === "string" ? alias : alias.name;
            this.registry[alias_name.toLowerCase()] = command;
        }
    }

    protected async run_help(meta: CLICMDExecMeta) {
        const parent_args_str = CLIUtils.parsePArgs(meta.parent_args, true);

        let help_message = "Available commands:\n" +
                           ` - ${parent_args_str}help: Show available commands`;

        for (const [alias, cmd] of Object.entries(this.registry)) {
            if (!CLIUtils.canRunInCurrentEnvironment(meta.environment, cmd)) continue;
            if (alias !== cmd.name) {
                if (cmd.aliases.some(a => (a as any).showInHelp)) {
                    help_message += `\n - ${parent_args_str}${alias}: Alias for ${cmd.name}`;
                }
                continue;
            }

            help_message += `\n - ${parent_args_str}${alias}: ${cmd.description}`;
        }

        meta.logToConsole(help_message);
    }

    protected async run_empty(meta: CLICMDExecMeta) {
        return await this.run_help(meta);
    }

    protected async run_notFound(command_name: string, meta: CLICMDExecMeta) {
        const parent_args_str = CLIUtils.parsePArgs(meta.parent_args, true);
        meta.logToConsole(`Command '${parent_args_str}${command_name}' not found. Type "${parent_args_str}help" for available commands.`);
    }

    protected async run_sub_help(cmd: CLICMD, meta: CLICMDExecMeta) {
        const parent_args_str = CLIUtils.parsePArgs(meta.parent_args, true);
        meta.logToConsole(
            `Command '${parent_args_str}${cmd.name}':\n` +
            `Description: ${cmd.description}\n` +
            `Usage: '${parent_args_str}${cmd.usage}'\n` +
            `Aliases: ${cmd.aliases.join(", ")}`
        );
    }

    async run(args: string[], meta: CLICMDExecMeta) {
        const command_name = args.shift();
        if (!command_name) return await this.run_empty(meta);

        if (
            command_name === "help" ||
            command_name === "--help" ||
            command_name === "-h"
        ) return await this.run_help(meta);

        const cmd = this.registry[command_name];
        if (!cmd || !CLIUtils.canRunInCurrentEnvironment(meta.environment, cmd)) return await this.run_notFound(command_name, meta);

        if (args[0] === "--help" || args[0] === "-h") return await this.run_sub_help(cmd, meta);

        meta.parent_args.push(command_name);
        return await cmd.run(args, meta);
    }

}
