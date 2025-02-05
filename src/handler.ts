import { CLISubCMD } from "./command.js";
import { CLICMDExecEnv, CLICMDExecMeta, CLILogFN } from "./types.js";

export class CLIApp extends CLISubCMD {
    public name = "root";
    public description = "CLI Root";
    public usage = "Command has no usage";

    constructor(
        public environment: CLICMDExecEnv,
        protected readonly logToConsole: CLILogFN = console.log
    ) {
        super();
    }

    protected registerCommands(): void {}

    protected async run_empty(meta: CLICMDExecMeta): Promise<void> {
        //cli.cmd.info(`Command not recognized. Type "${CLIUtils.parsePArgs(parent_args, true)}help" for available commands.`);
        return;
    }

    async handle(input: string) {
        await this.run(input.trim().toLowerCase().split(" ").filter(arg => arg), {
            parent_args: [],
            environment: this.environment,
            logToConsole: this.logToConsole
        });
    }

}
