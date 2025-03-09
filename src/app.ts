import { CLISubCMD } from "./command.js";
import { CLICMDExecEnv, CLICMDExecMeta, CLILogFN } from "./types.js";

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

    protected async run_empty(meta: CLICMDExecMeta): Promise<void> {
        //cli.cmd.info(`Command not recognized. Type "${CLIUtils.parsePArgs(parent_args, true)}help" for available commands.`);
        return;
    }

    async run(args: string[], meta: CLICMDExecMeta = {
        parent_args: [],
        environment: this.environment,
        logToConsole: this.logToConsole
    }): Promise<void> {
        return super.run(args, meta);
    }

    async handle(input: string) {
        await this.run(input.trim().toLowerCase().split(" ").filter(arg => arg));
    }

}
