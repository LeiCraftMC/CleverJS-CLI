import { CLISubCMD } from "./command.js";
import { CLICMDExecEnv, CLICMDExecMeta, CLILogFN } from "./types.js";

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
        public environment: CLICMDExecEnv,
        protected readonly logToConsole: CLILogFN = console.log
    ) {
        super();
    }

    protected async run_empty(meta: CLICMDExecMeta) {
        //cli.cmd.info(`Command not recognized. Type "${CLIUtils.parsePArgs(parent_args, true)}help" for available commands.`);
        return;
    }

    async handle(input: string | string[]) {
        const default_meta: CLICMDExecMeta = {
            parent_args: [],
            environment: this.environment,
            logToConsole: this.logToConsole
        }
        if (typeof input === "string") {
            await this.run(
                input.trim().toLowerCase().split(" ").filter(arg => arg),
                default_meta
            );
        } else {
            await this.run(input, default_meta);
        }
    }

}
