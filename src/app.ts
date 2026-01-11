import { CLISubCMD } from "./command.js";
import { CLICMDExecEnv, CLICMDExecMeta, CLILogger } from "./types.js";

export interface CLIApp {
    /**
     * @deprecated Use {@link CLIApp.handle} instead.
     */
    run(args: string[], meta: CLICMDExecMeta): Promise<void>;
}

export abstract class CLIApp extends CLISubCMD {
    readonly name = "root";
    readonly description = "CLI Root";
    readonly usage = "Command has no usage";

    constructor(
        public allowedEnvironment: CLICMDExecEnv,
        protected readonly logger: CLILogger = console
    ) {
        super();
    }

    protected async run_empty(meta: CLICMDExecMeta) {
        //cli.cmd.info(`Command not recognized. Type "${CLIUtils.parsePArgs(parent_args, true)}help" for available commands.`);
        if (meta.environment === "shell") {
            return await this.run_help(meta);
        }
    }

    async handle(input: string | string[]) {
        const default_meta: CLICMDExecMeta = {
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
