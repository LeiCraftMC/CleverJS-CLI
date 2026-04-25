import { CLICommandArg } from "./args";
import { CLISubCommandGroup } from "./commandGroup";
import { CLICMDExecEnv, CLICommandContext, CLILogger } from "./types.js";

export interface CLIApp<
    FlagSpecsT extends CLICommandArg.Flag.SpecList = CLICommandArg.Flag.SpecList,
    StateT extends object = Record<string, never>
> {
    /**
     * @deprecated Use {@link CLIApp.handle} instead.
     */
    dispatch(args: string[], ctx: CLICommandContext<StateT>): Promise<boolean>;
}

export class CLIApp<
    FlagSpecsT extends CLICommandArg.Flag.SpecList = CLICommandArg.Flag.SpecList,
    StateT extends object = Record<string, never>
> extends CLISubCommandGroup<FlagSpecsT, StateT> {

    protected readonly logger: CLILogger;

    protected readonly settings: {
        exitOnError?: boolean;
    }

    protected readonly defaultState: StateT;

    /**
     * 
     * @param options Configuration options for the CLI application.
     */
    constructor(options?: {
        logger?: CLILogger,
        allowedEnvironment?: CLICMDExecEnv,
        globalFlags?: FlagSpecsT,
        state?: StateT,
        /**
         * Whether to exit the process with a non-zero code on command errors. Defaults to `true` when running in a shell environment.
         */
        exitOnError?: boolean
    }) {
        super({
            name: "root",
            description: "CLI Root",
            allowedEnvironment: "all",
            flags: options?.globalFlags
        });

        this.settings = {
            exitOnError: options?.exitOnError
        };

        this.defaultState = (options?.state || {}) as StateT;

        this.logger = options?.logger || console;
    }

    protected async onEmpty(ctx: CLICommandContext<StateT>) {
        //cli.cmd.info(`Command not recognized. Type "${CLIUtils.parsePArgs(parent_args, true)}help" for available commands.`);
        if (ctx.environment === "shell") {
            return await this.onHelp(ctx);
        }
    }

    async handle(input: string | string[], env: CLICMDExecEnv = "shell", state?: Partial<StateT>) {

        const default_meta = new CLICommandContext<StateT>({
            raw_args: [],
            raw_parent_args: [],
            environment: env,
            logger: this.logger,
            state: {
                ...this.defaultState,
                ...(state || {})
            } as StateT
        });

        let result: boolean;

        if (typeof input === "string") {

            result = await this.dispatch(
                input.trim().toLowerCase().split(" ").filter(arg => arg),
                default_meta
            );

        } else {
            result = await this.dispatch(input.map(arg => arg.toLowerCase()), default_meta);
        }

        if (this.settings.exitOnError || (this.settings.exitOnError === undefined && env === "shell")) {
            if (!result) {
                process.exit(1);
            }
        }
    }

}
