import { CLISubCommandGroup } from "./commandGroup";
import { CLICMDExecEnv, CLICommandContext, CLILogger } from "./types.js";

export interface CLIApp {
    /**
     * @deprecated Use {@link CLIApp.handle} instead.
     */
    run(args: string[], ctx: CLICommandContext): Promise<void>;
}

export abstract class CLIApp extends CLISubCommandGroup {
    readonly name = "root";
    readonly description = "CLI Root";
    readonly usage = "Command has no usage";

    constructor(
        public allowedEnvironment: CLICMDExecEnv,
        protected readonly logger: CLILogger = console
    ) {
        super();
    }

    protected async run_empty(ctx: CLICommandContext) {
        //cli.cmd.info(`Command not recognized. Type "${CLIUtils.parsePArgs(parent_args, true)}help" for available commands.`);
        if (ctx.environment === "shell") {
            return await this.run_help(ctx);
        }
    }

    async handle(input: string | string[]) {
        const default_meta: CLICommandContext = {
            raw_parent_args: [],
            environment: this.allowedEnvironment,
            logger: this.logger
        }
        if (typeof input === "string") {
            await this.run(
                input.trim().toLowerCase().split(" ").filter(arg => arg),
                default_meta
            );
        } else {
            await this.run(input.map(arg => arg.toLowerCase()), default_meta);
        }
    }

}
