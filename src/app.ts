import { CLICommandArg } from "./args";
import { CLISubCommandGroup } from "./commandGroup";
import { CLICMDExecEnv, CLICommandContext, CLILogger } from "./types.js";

export interface CLIApp {
    /**
     * @deprecated Use {@link CLIApp.handle} instead.
     */
    dispatch(args: string[], ctx: CLICommandContext): Promise<boolean>;
}

export class CLIApp extends CLISubCommandGroup {

    protected readonly logger: CLILogger;

    protected readonly settings: {
        exitOnError?: boolean;
    }

    /**
     * 
     * @param options Configuration options for the CLI application.
     */
    constructor(options?: {
        logger?: CLILogger,
        allowedEnvironment?: CLICMDExecEnv,
        globalFlags?: CLICommandArg.Flag.SpecList,
        /**
         * Whether to exit the process with a non-zero code on command errors. Defaults to `true` when running in a shell environment.
         */
        exitOnError?: boolean
    }) {
        super({
            name: "root",
            description: "CLI Root",
            allowedEnvironment: "all",
            args: {
                args: [],
                flags: options?.globalFlags || []
            }
        });

        this.settings = {
            exitOnError: options?.exitOnError
        };

        this.logger = options?.logger || console;
    }

    protected async onEmpty(ctx: CLICommandContext) {
        //cli.cmd.info(`Command not recognized. Type "${CLIUtils.parsePArgs(parent_args, true)}help" for available commands.`);
        if (ctx.environment === "shell") {
            return await this.onHelp(ctx);
        }
    }

    async handle(input: string | string[], env: CLICMDExecEnv = "shell") {

        const default_meta: CLICommandContext = {
            raw_args: [],
            raw_parent_args: [],
            environment: env,
            logger: this.logger
        }

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
