import { describe, expect, test } from "bun:test";
import { CLIBaseCommand, CLICommandArg, CLICommandContext, CLISubCommandGroup } from "@cleverjs/cli";

class MemoryLogger {
    readonly debugMessages: string[] = [];
    readonly infoMessages: string[] = [];
    readonly warnMessages: string[] = [];
    readonly errorMessages: string[] = [];

    debug(message: string) {
        this.debugMessages.push(message);
    }

    info(message: string) {
        this.infoMessages.push(message);
    }

    warn(message: string) {
        this.warnMessages.push(message);
    }

    error(message: string) {
        this.errorMessages.push(message);
    }
}

function createCtx(logger: MemoryLogger, env: "runtime" | "shell" = "runtime"): CLICommandContext {
    return {
        raw_args: [],
        raw_parent_args: [],
        environment: env,
        logger
    };
}

class TrackCommand extends CLIBaseCommand {

    constructor(
        private readonly onRun: () => void,
        options?: Partial<CLIBaseCommand.Options<any>>
    ) {
        super({
            name: options?.name ?? "ping",
            description: options?.description ?? "Track command",
            args: options?.args,
            aliases: options?.aliases,
            allowedEnvironment: options?.allowedEnvironment
        });
    }

    async run(): Promise<boolean> {
        this.onRun();
        return true;
    }
}

describe("CLISubCommandGroup", () => {

    test("dispatches registered command and alias", async () => {
        let runCount = 0;

        const cmd = new TrackCommand(() => {
            runCount += 1;
        }, {
            name: "ping",
            aliases: ["p"]
        });

        const group = new CLISubCommandGroup({
            name: "root"
        }).register(cmd);

        const logger = new MemoryLogger();

        expect(await group.dispatch(["ping"], createCtx(logger))).toBe(true);
        expect(await group.dispatch(["p"], createCtx(logger))).toBe(true);
        expect(runCount).toBe(2);
    });

    test("shows help on empty args and explicit help", async () => {
        const group = new CLISubCommandGroup({
            name: "root",
            flags: CLICommandArg.defineCLIFlagSpecs([
                { name: "cwd", type: "string", description: "Working directory" }
            ])
        }).register(new TrackCommand(() => {}, { name: "ping", description: "Ping command" }));

        const logger = new MemoryLogger();

        expect(await group.dispatch([], createCtx(logger))).toBe(true);
        expect(await group.dispatch(["help"], createCtx(logger))).toBe(true);
        expect(logger.infoMessages.length).toBe(2);
        expect(logger.infoMessages[0]).toContain("Available commands:");
        expect(logger.infoMessages[0]).toContain("--cwd");
    });

    test("shows sub command help with --help", async () => {
        const cmdSpec = CLICommandArg.defineCLIArgSpecs({
            args: [{ name: "input", type: "string", required: true }],
            flags: [{ name: "verbose", type: "boolean" }]
        });

        const group = new CLISubCommandGroup({
            name: "root"
        }).register(new TrackCommand(() => {}, {
            name: "build",
            description: "Build command",
            aliases: ["b"],
            args: cmdSpec
        }));

        const logger = new MemoryLogger();
        expect(await group.dispatch(["build", "--help"], createCtx(logger))).toBe(true);
        expect(logger.infoMessages.at(-1)).toContain("Command 'build':");
        expect(logger.infoMessages.at(-1)).toContain("Usage: 'build <input>'");
    });

    test("returns false and logs not found for unknown command", async () => {
        const group = new CLISubCommandGroup({
            name: "root"
        });

        const logger = new MemoryLogger();
        expect(await group.dispatch(["missing"], createCtx(logger))).toBe(false);
        expect(logger.infoMessages[0]).toContain("Command 'missing' not found");
    });

    test("respects allowedEnvironment filtering", async () => {
        let shellRuns = 0;

        const group = new CLISubCommandGroup({
            name: "root"
        }).register(new TrackCommand(() => {
            shellRuns += 1;
        }, {
            name: "shellonly",
            allowedEnvironment: "shell"
        }));

        const runtimeLogger = new MemoryLogger();
        expect(await group.dispatch(["shellonly"], createCtx(runtimeLogger, "runtime"))).toBe(false);
        expect(shellRuns).toBe(0);

        const shellLogger = new MemoryLogger();
        expect(await group.dispatch(["shellonly"], createCtx(shellLogger, "shell"))).toBe(true);
        expect(shellRuns).toBe(1);
    });
});
