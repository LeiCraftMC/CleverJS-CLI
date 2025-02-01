
export abstract class CLICMD {

    readonly abstract name: string;
    readonly abstract description: string;
    readonly abstract usage: string;
    
    /**
     * The environment in which the command can be executed.
     * 
     * - `all`: The command can be executed in any environment (both shell and runtime).
     * - `runtime`: The command can be executed only in an interactive runtime environment (e.g., a running application with a console).
     * - `shell`: The command can be executed only in a shell environment (e.g., terminal or command prompt).
     */
    readonly environment: "all" | "runtime" | "shell" = "all";

    abstract run(args: string[], parent_args: string[]): Promise<void>;

}

