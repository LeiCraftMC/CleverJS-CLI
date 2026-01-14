
export type CLICMDExecEnv = "runtime" | "shell";
export type CLICMDExecEnvSpec = "all" | "runtime" | "shell";

export type CLICMDAlias = string | {
    name: string;
    showInHelp?: boolean;
}

export interface CLILogger {
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

export interface CLICommandContext {
    readonly raw_args: string[];
    readonly raw_parent_args: string[];
    readonly environment: "runtime" | "shell";
    readonly logger: CLILogger;
}
