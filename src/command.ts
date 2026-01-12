import { CLIUtils } from "./utils.js";
import { CLICMDAlias, CLICMDExecEnvSpec, CLICMDExecMeta, } from "./types.js";
import { CLISubCommandGroup } from "./commandGroup.js";
import { CLICommandArg, CLICommandArgParser } from "./args.js";

export abstract class CLIBaseCommand<ArgsSpecT extends CLICommandArg.ArgSpecDefault = CLICommandArg.ArgSpecDefault> implements CLIBaseCommand.ICommand {

    readonly name: string;
    readonly description: string;
    readonly args: ArgsSpecT;
    readonly aliases: CLICMDAlias[];
    
    /**
     * The environment in which the command can be executed.
     * 
     * - `all`: The command can be executed in any environment (both shell and runtime).
     * - `runtime`: The command can be executed only in an interactive runtime environment (e.g., a running application with a console).
     * - `shell`: The command can be executed only in a shell environment (e.g., terminal or command prompt).
     */
    readonly allowedEnvironment: CLICMDExecEnvSpec;

    protected constructor(options: CLIBaseCommand.Options<ArgsSpecT>) {
        this.name = options.name;
        this.description = options.description || "No description provided.";
        this.args = options.args || { args: [], flags: [] } as any as ArgsSpecT;
        this.aliases = options.aliases || [];
        this.allowedEnvironment = options.allowedEnvironment || "all";
    }

    abstract run(args: CLICommandArgParser.ParsedArgs<ArgsSpecT>, meta: CLICMDExecMeta): Promise<void>;

}

export namespace CLIBaseCommand {

    export interface Options<ArgsSpecT extends CLICommandArg.ArgSpecDefault = CLICommandArg.ArgSpecDefault> {
        name: string;
        description?: string;
        args?: ArgsSpecT;
        aliases?: CLICMDAlias[];
        allowedEnvironment?: CLICMDExecEnvSpec;
    }

    export interface ICommand<ArgsSpecT extends CLICommandArg.ArgSpecDefault = CLICommandArg.ArgSpecDefault> {
        readonly name: string;
        readonly description: string;
        readonly args?: ArgsSpecT;
        readonly aliases: CLICMDAlias[];
        readonly allowedEnvironment: CLICMDExecEnvSpec;
        
        run(args: CLICommandArgParser.ParsedArgs<ArgsSpecT>, meta: CLICMDExecMeta): Promise<void>;
    }

    export interface Context {

    }

}
