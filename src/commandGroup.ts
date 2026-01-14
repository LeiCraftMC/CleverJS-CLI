import { Deferred } from "@cleverjs/utils";
import { CLICommandArg, CLICommandArgParser } from "./args";
import { CLIBaseCommand } from "./command";
import { CLICMDAlias, CLICMDExecEnvSpec, CLICommandContext } from "./types";
import { CLIUtils } from "./utils";

export class CLISubCommandGroup<ArgsSpecT extends CLICommandArg.ArgSpecDefault = CLICommandArg.ArgSpecDefault> implements CLISubCommandGroup.IGroup<ArgsSpecT> {

    readonly name: string;
    readonly description: string
    readonly args: ArgsSpecT;
    readonly aliases: CLICMDAlias[];
    readonly allowedEnvironment: CLICMDExecEnvSpec;

    protected readonly middleware: CLISubCommandGroup.IMiddleware<ArgsSpecT>[];

    protected readonly registry: Map<string, CLIBaseCommand<ArgsSpecT> | CLISubCommandGroup<ArgsSpecT>> = new Map();

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

    public register(command: CLIBaseCommand<ArgsSpecT>): this;
    public register(command: CLISubCommandGroup<ArgsSpecT>): this;
    public register(command: CLIBaseCommand<ArgsSpecT> | CLISubCommandGroup<ArgsSpecT>): this {

        this.registry.set(command.name.toLowerCase(), command);

        for (const alias of command.aliases) {
            const alias_name = typeof alias === "string" ? alias : alias.name;
            this.registry.set(alias_name.toLowerCase(), command);
        }

        return this;
    }

    protected async onHelp(ctx: CLICommandContext) {
        const parent_args_str = CLIUtils.parseParentArgs(ctx.raw_parent_args, true);

        let help_message = "Available commands:\n" +
                           ` - ${parent_args_str}help: Show available commands`;

        for (const [alias, cmd] of this.registry.entries()) {
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

    protected async onEmpty(ctx: CLICommandContext) {
        return await this.onHelp(ctx);
    }

    protected async onNotFound(command_name: string, ctx: CLICommandContext) {
        const parent_args_str = CLIUtils.parseParentArgs(ctx.raw_parent_args, true);
        ctx.logger.info(`Command '${parent_args_str}${command_name}' not found. Type "${parent_args_str}help" for available commands.`);
    }

    protected async onSubHelp(cmd: CLIBaseCommand, ctx: CLICommandContext) {

        const parent_args_str = CLIUtils.parseParentArgs(ctx.raw_parent_args, true);
        const usageStr = CLIUtils.generateUsageByArgSpec(cmd.args, true);

        ctx.logger.info(
            `Command '${parent_args_str}${cmd.name}':\n` +
            `Description: ${cmd.description}\n` +
            // generate usage string form args spec
            `Usage: '${parent_args_str}${cmd.name}${usageStr}'\n` +
            `Aliases: ${ cmd.aliases.join(", ") || "None" }`
        );
    }

    protected async callNextMiddleware(index: 0, parsedArgs: CLICommandArgParser.ParsedArgs<ArgsSpecT>, ctx: CLICommandContext): Promise<boolean>;
    protected async callNextMiddleware(index: number, parsedArgs: CLICommandArgParser.ParsedArgs<ArgsSpecT>, ctx: CLICommandContext): Promise<void>;
    protected async callNextMiddleware(index: number, parsedArgs: CLICommandArgParser.ParsedArgs<ArgsSpecT>, ctx: CLICommandContext): Promise<void | boolean> {

        if (this.middleware.length === 0) return Promise.resolve(true);

        const result = new Deferred<boolean>();

        if (index < this.middleware.length - 1) {
            return this.middleware[index](parsedArgs, ctx, () => this.callNextMiddleware(index + 1, parsedArgs, ctx));
        }

        if (index === this.middleware.length - 1) {
            return this.middleware[index](parsedArgs, ctx, async () => {
                // continue execution
                result.resolve(true);
                return;
            });
        }

        // dont continue execution
        if (!result.hasResolved()) {
            result.resolve(false);
        }

        return result;
    }

    async dispatch(args: string[], ctx: CLICommandContext) {
        const command_name = args.shift();
        if (!command_name) return await this.onEmpty(ctx);

        if (
            command_name === "help" ||
            command_name === "--help" ||
            command_name === "-h"
        ) return await this.onHelp(ctx);

        const groupArgParser = new CLICommandArgParser({

            // add a variadic positional arg to capture rest args
            args: this.args.args.concat([{
                name: "__rest_args",
                type: "string",
                variadic: true,
                description: "Rest arguments"
            }]),
            
            flags: this.args.flags
        });

        const parsedGroupArgs = await groupArgParser.parse(args);

        if (!parsedGroupArgs.success) {
            ctx.logger.error(`Error parsing arguments for command group '${this.name}': ${parsedGroupArgs.error}`);
            return;
        }

        const restArgs = (parsedGroupArgs.data.args as any)["__rest_args"] as string[];

        const continueExecution = await this.callNextMiddleware(0, parsedGroupArgs.data as CLICommandArgParser.ParsedArgs<ArgsSpecT>, ctx);
        if (!continueExecution) return;
    
        const cmd = this.registry.get(command_name);
        if (!cmd || !CLIUtils.canRunInCurrentEnvironment(ctx.environment, cmd)) return await this.onNotFound(command_name, ctx);

        if (restArgs[0] === "--help" || restArgs[0] === "-h") {

            if (cmd instanceof CLIBaseCommand) {
                return await this.onSubHelp(cmd, ctx);
            }
            // if group, let the subgroup handle help
        }

        ctx.raw_parent_args.push(command_name);
        
        if (cmd instanceof CLIBaseCommand) {

            if (cmd.args) {

                const cmdArgParser = new CLICommandArgParser(cmd.args);

                const parsedCmdArgs = await cmdArgParser.parse(restArgs);

                if (!parsedCmdArgs.success) {
                    ctx.logger.error(`Error parsing arguments for command '${cmd.name}': ${parsedCmdArgs.error}`);
                    return;
                }

                return await cmd.run(parsedCmdArgs.data, ctx);
            }
            return await cmd.run({ args: {}, flags: {} } as any, ctx);
        }

        await cmd.dispatch(restArgs, ctx);
    }

}

export namespace CLISubCommandGroup {

    export interface IMiddleware<ArgsT extends CLICommandArg.ArgSpecDefault> {
        (args: CLICommandArgParser.ParsedArgs<ArgsT>, ctx: CLICommandContext, next: () => Promise<void>): Promise<void>;
    }

    export interface IGroup<ArgsSpecT extends CLICommandArg.ArgSpecDefault> extends Omit<CLIBaseCommand.ICommand<ArgsSpecT>, "run"> {
        dispatch(args: string[], ctx: CLICommandContext): Promise<void>;
    }

    export interface Options<ArgsSpecT extends CLICommandArg.ArgSpecDefault> extends CLIBaseCommand.Options<ArgsSpecT> {}

}