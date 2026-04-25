import { afterEach, describe, expect, test } from "bun:test";
import { CLIApp, CLIBaseCommand, CLICommandContext, CLISubCommandGroup } from "@cleverjs/cli";

class TrackCommand extends CLIBaseCommand {

    constructor(private readonly onRun: (args: any) => void) {
        super({
            name: "ping",
            description: "Track command"
        });
    }

    async run(args: any): Promise<boolean> {
        this.onRun(args);
        return true;
    }
}

const originalExit = process.exit;

afterEach(() => {
    (process as any).exit = originalExit;
});

describe("CLIApp.handle", () => {

    test("accepts string input and normalizes command casing", async () => {
        let executed = 0;

        const app = new CLIApp({ exitOnError: false })
            .register(new TrackCommand(() => {
                executed += 1;
            }));

        await app.handle("PING", "runtime");
        expect(executed).toBe(1);
    });

    test("does not exit process when exitOnError is false", async () => {
        const codes: number[] = [];

        (process as any).exit = (code: number) => {
            codes.push(code);
        };

        const app = new CLIApp({ exitOnError: false });
        await app.handle("missing", "runtime");

        expect(codes.length).toBe(0);
    });

    test("exits with code 1 when exitOnError is true and dispatch fails", async () => {
        const codes: number[] = [];

        (process as any).exit = (code: number) => {
            codes.push(code);
        };

        const app = new CLIApp({ exitOnError: true });
        await app.handle("missing", "runtime");

        expect(codes).toEqual([1]);
    });

    test("uses default shell behavior to exit on error", async () => {
        const codes: number[] = [];

        (process as any).exit = (code: number) => {
            codes.push(code);
        };

        const app = new CLIApp();
        await app.handle("missing", "shell");

        expect(codes).toEqual([1]);
    });

    test("passes typed state into middleware and nested sub commands", async () => {
        type AppState = {
            tenantId: string;
            executed: number;
            trace: string[];
        };

        class TenantCommand extends CLIBaseCommand<any, AppState> {
            constructor(private readonly onRun: (state: AppState) => void) {
                super({
                    name: "tenant",
                    description: "Tenant command"
                });
            }

            async run(_args: any, ctx: CLICommandContext<AppState>): Promise<boolean> {
                const state = ctx.getState();
                state.executed += 1;
                state.trace.push(`command:${state.tenantId}`);
                this.onRun(state);
                return true;
            }
        }

        let observedTenantId = "";
        let observedExecuted = -1;
        let observedTrace: string[] = [];

        const nested = new CLISubCommandGroup<any, AppState>({ name: "admin" })
            .register(new TenantCommand((state) => {
                observedTenantId = state.tenantId;
                observedExecuted = state.executed;
                observedTrace = [...state.trace];
            }));

        const app = new CLIApp<any, AppState>({
            exitOnError: false,
            state: {
                tenantId: "default",
                executed: 0,
                trace: []
            }
        })
            .use(async (_flags, ctx, next) => {
                const trace = ctx.get("trace");
                trace.push("mw");
                ctx.set("trace", trace);
                await next();
            })
            .register(nested);

        await app.handle(["admin", "tenant"], "runtime", { tenantId: "acme" });

        expect(observedTenantId).toBe("acme");
        expect(observedExecuted).toBe(1);
        expect(observedTrace).toEqual(["mw", "command:acme"]);
    });
});
