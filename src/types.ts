
export type Dict<T, K extends string | number = string> = Record<K, T>;

export type CLICMDExecEnv = "runtime" | "shell";
export type CLICMDExecEnvSpec = "all" | "runtime" | "shell";

export interface CLILogFN {
    (message: string): void;
}

export interface CLICMDExecMeta {
    parent_args: string[];
    environment: "runtime" | "shell";
    logToConsole: CLILogFN;
}
