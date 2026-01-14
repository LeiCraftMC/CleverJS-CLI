import { CLICommandArg } from "./args";
import { type CLIBaseCommand } from "./command";
import { CLICMDAlias, CLICMDExecEnvSpec, CLICommandContext } from "./types";
import { CLIUtils } from "./utils";

export class CLISubCommandGroup<ArgsSpecT extends CLICommandArg.ArgSpecDefault = CLICommandArg.ArgSpecDefault> implements CLISubCommandGroup.IGroup<ArgsSpecT> {

    readonly name: string;
    readonly description: string
    readonly args: ArgsSpecT;
    readonly aliases: CLICMDAlias[];
    readonly allowedEnvironment: CLICMDExecEnvSpec;

    readonly middleware: CLISubCommandGroup.IMiddleware<ArgsSpecT>[];

    protected readonly registry: Map<string, CLIBaseCommand.ICommand<ArgsSpecT> | CLISubCommandGroup.IGroup<ArgsSpecT>> = new Map();

    constructor(options: CLISubCommandGroup.Options<ArgsSpecT>) {

        if (!CLIUtils.isValidCommandName(options.name)) {
            throw new Error(`Invalid command name: "${options.name}". Command names must be non-empty strings containing only alphanumeric characters, dashes, and underscores.`);
        }

        this.name = options.name;
        this.description = options.description || "No description provided.";
        this.args = options.args || { args: [], flags: [] } as any as ArgsSpecT;
        this.aliases = options.aliases || [];
        this.allowedEnvironment = options.allowedEnvironment || "all";

        this.middleware = [];

    }

    public use(mw: CLISubCommandGroup.IMiddleware<ArgsSpecT>): this {
        this.middleware.push(mw);
        return this;
    }

    public register(command: CLIBaseCommand.ICommand<ArgsSpecT>): this;
    public register(command: CLISubCommandGroup.IGroup<ArgsSpecT>): this;
    public register(command: CLIBaseCommand.ICommand<ArgsSpecT> | CLISubCommandGroup.IGroup<ArgsSpecT>): this {

        this.registry.set(command.name.toLowerCase(), command);

        for (const alias of command.aliases) {
            const alias_name = typeof alias === "string" ? alias : alias.name;
            this.registry.set(alias_name.toLowerCase(), command);
        }

        return this;
    }

    protected async run_help(ctx: CLICommandContext) {
        const parent_args_str = CLIUtils.parseParentArgs(ctx.raw_parent_args, true);

        let help_message = "Available commands:\n" +
                           ` - ${parent_args_str}help: Show available commands`;

        for (const [alias, cmd] of Object.entries(this.registry)) {
            if (!CLIUtils.canRunInCurrentEnvironment(ctx.environment, cmd)) continue;
            if (alias !== cmd.name) {
                if (cmd.aliases.some(a => (a as any).showInHelp)) {
                    help_message += `\n - ${parent_args_str}${alias}: Alias for ${cmd.name}`;
                }
                continue;
            }

            help_message += `\n - ${parent_args_str}${alias}: ${cmd.description}`;
        }

        ctx.logger.info(help_message);
    }

    protected async run_empty(ctx: CLICommandContext) {
        return await this.run_help(ctx);
    }

    protected async run_notFound(command_name: string, ctx: CLICommandContext) {
        const parent_args_str = CLIUtils.parseParentArgs(ctx.raw_parent_args, true);
        ctx.logger.info(`Command '${parent_args_str}${command_name}' not found. Type "${parent_args_str}help" for available commands.`);
    }

    protected async run_sub_help(cmd: CLIBaseCommand, ctx: CLICommandContext) {
        const parent_args_str = CLIUtils.parseParentArgs(ctx.raw_parent_args, true);
        ctx.logger.info(
            `Command '${parent_args_str}${cmd.name}':\n` +
            `Description: ${cmd.description}\n` +
            // generate usage string form args spec
            `Usage: '${parent_args_str}${cmd.usage}'\n` +
            `Aliases: ${cmd.aliases.join(", ")}`
        );
    }

    async dispatch(args: string[], ctx: CLICommandContext) {
        const command_name = args.shift();
        if (!command_name) return await this.run_empty(ctx);

        if (
            command_name === "help" ||
            command_name === "--help" ||
            command_name === "-h"
        ) return await this.run_help(ctx);

        const cmd = this.registry.get(command_name);
        if (!cmd || !CLIUtils.canRunInCurrentEnvironment(ctx.environment, cmd)) return await this.run_notFound(command_name, ctx);

        if (args[0] === "--help" || args[0] === "-h") return await this.run_sub_help(cmd, ctx);

        ctx.raw_parent_args.push(command_name);
        return await cmd.run(args, ctx);
    }

}

export namespace CLISubCommandGroup {

    export interface IMiddleware<ArgsT extends CLICommandArg.ArgSpecDefault> {
        (args: ArgsT, ctx: CLICommandContext, next: () => Promise<void>): Promise<void>;
    }

    export interface IGroup<ArgsSpecT extends CLICommandArg.ArgSpecDefault> extends Omit<CLIBaseCommand.ICommand<ArgsSpecT>, "run"> {
        middleware: IMiddleware<ArgsSpecT>[];
        dispatch(args: string[], ctx: CLICommandContext): Promise<void>;
    }

    export interface Options<ArgsSpecT extends CLICommandArg.ArgSpecDefault> extends CLIBaseCommand.Options<ArgsSpecT> {}

}