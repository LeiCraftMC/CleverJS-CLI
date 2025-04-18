
export type Dict<T, K extends string | number = string> = Record<K, T>;

export type CLICMDExecEnv = "runtime" | "shell";
export type CLICMDExecEnvSpec = "all" | "runtime" | "shell";

export type CLICMDAlias = string | {
    name: string;
    showInHelp?: boolean;
}

export interface CLILogFN {
    (message: string): void;
}

export interface CLICMDExecMeta {
    readonly parent_args: string[];
    readonly environment: "runtime" | "shell";
    readonly logToConsole: CLILogFN;
}
