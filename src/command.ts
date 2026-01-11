import { CLIUtils } from "./utils.js";
import { CLICMDAlias, CLICMDExecEnvSpec, CLICMDExecMeta, } from "./types.js";
import { CLICommandGroup } from "./commandGroup.js";


export abstract class CLIBaseCommand implements CLIBaseCommand.ICommand {

    readonly name: string;
    readonly description: string;
    readonly args: ArgSpec[];
    readonly usage: string;
    readonly aliases: CLICMDAlias[];
    
    /**
     * The environment in which the command can be executed.
     * 
     * - `all`: The command can be executed in any environment (both shell and runtime).
     * - `runtime`: The command can be executed only in an interactive runtime environment (e.g., a running application with a console).
     * - `shell`: The command can be executed only in a shell environment (e.g., terminal or command prompt).
     */
    readonly allowedEnvironment: CLICMDExecEnvSpec;

    constructor(options: CLIBaseCommand.Options) {
        this.name = options.name;
        this.description = options.description || "No description provided.";
        this.usage = options.usage || options.name;
        this.aliases = options.aliases || [];
        this.allowedEnvironment = options.allowedEnvironment || "all";
    }

    abstract run(args: string[], meta: CLICMDExecMeta): Promise<void>;

}

export namespace CLIBaseCommand {

    export interface Options {
        name: string;
        description?: string;
        args?: ArgSpec[];
        usage?: string;
        aliases?: CLICMDAlias[];
        allowedEnvironment?: CLICMDExecEnvSpec;
    }

    export interface ICommand {
        readonly name: string;
        readonly description: string;
        readonly args?: ArgSpec[];
        readonly usage?: string;
        readonly aliases: CLICMDAlias[];
        readonly allowedEnvironment: CLICMDExecEnvSpec;
        
        run(args: string[], meta: CLICMDExecMeta): Promise<void>;
    }

    export interface Context {

    }

}

export abstract class CLISubCMD extends CLICommandGroup implements ICLICommand {

    readonly abstract name: string;
    readonly abstract description: string;
    readonly abstract usage: string;
    readonly aliases: CLICMDAlias[] = [];
    readonly allowedEnvironment: CLICMDExecEnvSpec = "all";

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

    protected async run_help(meta: CLICMDExecMeta) {
        const parent_args_str = CLIUtils.parseParentArgs(meta.raw_parent_args, true);

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

        meta.logger.info(help_message);
    }

    protected async run_empty(meta: CLICMDExecMeta) {
        return await this.run_help(meta);
    }

    protected async run_notFound(command_name: string, meta: CLICMDExecMeta) {
        const parent_args_str = CLIUtils.parseParentArgs(meta.raw_parent_args, true);
        meta.logger.info(`Command '${parent_args_str}${command_name}' not found. Type "${parent_args_str}help" for available commands.`);
    }

    protected async run_sub_help(cmd: CLIBaseCommand, meta: CLICMDExecMeta) {
        const parent_args_str = CLIUtils.parseParentArgs(meta.raw_parent_args, true);
        meta.logger.info(
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

        meta.raw_parent_args.push(command_name);
        return await cmd.run(args, meta);
    }

}
