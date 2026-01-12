import { CLICommandArg } from "./args";
import { type CLIBaseCommand } from "./command";
import { CLICMDAlias, CLICMDExecEnvSpec } from "./types";

export class CLISubCommandGroup<ArgsSpecT extends CLICommandArg.ArgSpecDefault = CLICommandArg.ArgSpecDefault> implements CLISubCommandGroup.IGroup {

    readonly description: string;
    readonly allowedEnvironment: CLICMDExecEnvSpec = "all";

    protected readonly registry: Record<string, CLIBaseCommand.ICommand | CLISubCommandGroup.IGroup> = {};

    constructor(options: CLISubCommandGroup.Options) {
        
        this.prefix = options.prefix;
        this.description = options.description || "No description provided.";
        this.prefixAliases = options.prefixAliases || [];
        this.allowedEnvironment = options.allowedEnvironment || "all";

    }

    public register(command: CLIBaseCommand.ICommand | CLISubCommandGroup.IGroup): this {

        this.registry[command.name.toLowerCase()] = command;

        for (const alias of command.aliases) {
            const alias_name = typeof alias === "string" ? alias : alias.name;
            this.registry[alias_name.toLowerCase()] = command;
        }

        return this;
    }

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

export namespace CLISubCommandGroup {

    export interface IGroup extends CLIBaseCommand.ICommand {}

    export interface Options extends CLIBaseCommand.Options {}

}