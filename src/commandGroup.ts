import { CLICommandArg, CLICommandArgParser } from "./args";
import { CLIBaseCommand } from "./command";
import { CLICMDAlias, CLICMDExecEnvSpec, CLICommandContext } from "./types";
import { CLIUtils } from "./utils";

export class CLISubCommandGroup<FlagsSpecT extends CLICommandArg.Flag.SpecList = CLICommandArg.Flag.SpecList> implements CLISubCommandGroup.IGroup<FlagsSpecT> {

    readonly name: string;
    readonly description: string
    readonly flags: FlagsSpecT;
    readonly aliases: CLICMDAlias[];
    readonly allowedEnvironment: CLICMDExecEnvSpec;

    protected readonly middleware: CLISubCommandGroup.IMiddleware<FlagsSpecT>[];

    protected readonly registry: Map<string, CLIBaseCommand | CLISubCommandGroup> = new Map();

    constructor(options: CLISubCommandGroup.Options<FlagsSpecT>) {

        if (!CLIUtils.isValidCommandName(options.name)) {
            throw new Error(`Invalid command name: "${options.name}". Command names must be non-empty strings containing only alphanumeric characters, dashes, and underscores.`);
        }

        this.name = options.name;
        this.description = options.description || "No description provided.";

        this.flags = options.flags || [] as any as FlagsSpecT;

        this.aliases = options.aliases || [];
        this.allowedEnvironment = options.allowedEnvironment || "all";

        this.middleware = [];

    }

    public use(mw: CLISubCommandGroup.IMiddleware<FlagsSpecT>): this {
        this.middleware.push(mw);
        return this;
    }

    public register(command: CLIBaseCommand): this;
    public register(command: CLISubCommandGroup): this;
    public register(command: CLIBaseCommand | CLISubCommandGroup): this {

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

        if (this.flags.length > 0) {
            help_message += `\n\nFlags:\n`;
            help_message += CLIUtils.generateFlagsHelpList({ args: [], flags: this.flags });
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

        const lines = [
            `Command '${parent_args_str}${cmd.name}':`,
            `Description: ${cmd.description}`,
            // generate usage string form args spec
            `Usage: '${parent_args_str}${cmd.name}${usageStr}'`,
            `Aliases: ${ cmd.aliases.join(", ") || "None" }`
        ];

        if (cmd.args.args.length > 0) {
            lines.push(`\nPositional Arguments:`);
            lines.push(CLIUtils.generateArgsHelpList(cmd.args));
        }

        if (cmd.args.flags.length > 0) {
            lines.push(`\nFlags:`);
            lines.push(CLIUtils.generateFlagsHelpList(cmd.args));
        }

        ctx.logger.info(lines.join("\n"));
    }

    protected async callNextMiddleware(index: number, parsedFlags: CLICommandArgParser.ParsedFlags<FlagsSpecT>, ctx: CLICommandContext): Promise<boolean> {

        if (index >= this.middleware.length) {
            return true;
        }

        let shouldContinue = false;

        await this.middleware[index](parsedFlags, ctx, async () => {
            shouldContinue = await this.callNextMiddleware(index + 1, parsedFlags, ctx);
        });

        return shouldContinue;
    }

    async dispatch(args: string[], ctx: CLICommandContext): Promise<boolean> {

        const groupFlagParser = new CLICommandArgParser({

            // add a variadic positional arg to capture rest args
            args: [{
                name: "__rest_args",
                type: "string",
                variadic: true,
                description: "Rest arguments"
            }],
            
            flags: this.flags
        });

        const parsedGroupArgs = await groupFlagParser.parse(args);

        if (!parsedGroupArgs.success) {
            ctx.logger.error(`Error parsing arguments for command group '${this.name}': ${parsedGroupArgs.error}`);
            return false;
        }

        const restArgs = (parsedGroupArgs.data.args as any)["__rest_args"] as string[];

        const continueExecution = await this.callNextMiddleware(0, parsedGroupArgs.data.flags as CLICommandArgParser.ParsedFlags<FlagsSpecT>, ctx);
        if (!continueExecution) return false;

        const command_name = restArgs.shift()?.toLowerCase();

        if (!command_name) {
            await this.onEmpty(ctx);
            return true;
        }

        if (
            command_name === "help" ||
            command_name === "--help" ||
            command_name === "-h"
        ) {
            await this.onHelp(ctx);
            return true;
        }
    
        const cmd = this.registry.get(command_name);
        if (!cmd || !CLIUtils.canRunInCurrentEnvironment(ctx.environment, cmd)) {
            await this.onNotFound(command_name, ctx);
            return false;
        }

        if (restArgs[0] === "--help" || restArgs[0] === "-h") {

            if (cmd instanceof CLIBaseCommand) {
                await this.onSubHelp(cmd, ctx);
                return true;
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
                    return false;
                }

                return await cmd.run(parsedCmdArgs.data, ctx);
            }
            return await cmd.run({ args: {}, flags: {} } as any, ctx);
        }

        return await cmd.dispatch(restArgs, ctx);
    }

}

export namespace CLISubCommandGroup {

    export interface IMiddleware<ArgsT extends CLICommandArg.Flag.SpecList> {
        (args: CLICommandArgParser.ParsedFlags<ArgsT>, ctx: CLICommandContext, next: () => Promise<void>): Promise<void>;
    }

    export interface IGroup<FlagsSpecT extends CLICommandArg.Flag.SpecList> extends Omit<CLIBaseCommand.ICommand<any>, "args" | "run"> {
        dispatch(args: string[], ctx: CLICommandContext): Promise<boolean>;
        flags?: FlagsSpecT;
    }

    export interface Options<FlagsSpecT extends CLICommandArg.Flag.SpecList> extends Omit<CLIBaseCommand.Options<any>, "args"> {
        flags?: FlagsSpecT;
    }

}