
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

export class CLICommandContext<StateT extends object = Record<string, never>> {
    readonly raw_args: string[];
    readonly raw_parent_args: string[];
    readonly environment: "runtime" | "shell";
    readonly logger: CLILogger;

    protected _state: StateT;

    constructor(options: {
        raw_args?: string[];
        raw_parent_args?: string[];
        environment: "runtime" | "shell";
        logger: CLILogger;
        state?: StateT;
    }) {
        this.raw_args = options.raw_args || [];
        this.raw_parent_args = options.raw_parent_args || [];
        this.environment = options.environment;
        this.logger = options.logger;
        this._state = (options.state || {}) as StateT;
    }

    getState(): StateT {
        return this._state;
    }

    setState(state: StateT): void {
        this._state = state;
    }

    get<KeyT extends keyof StateT>(key: KeyT): StateT[KeyT] {
        return this._state[key];
    }

    set<KeyT extends keyof StateT>(key: KeyT, value: StateT[KeyT]): void {
        this._state[key] = value;
    }

    patchState(state: Partial<StateT>): void {
        this._state = {
            ...this._state,
            ...state
        };
    }
}
