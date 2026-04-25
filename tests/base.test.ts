import { describe, expect, test } from "bun:test";
import { CLIApp, CLIBaseCommand, CLICommandContext } from "@cleverjs/cli";

function createTestContext(): CLICommandContext {
	return new CLICommandContext({
		raw_args: [],
		raw_parent_args: [],
		environment: "runtime",
		logger: {
			debug: () => {},
			info: () => {},
			warn: () => {},
			error: () => {}
		}
	});
}

class TestCommand extends CLIBaseCommand {

	constructor(private readonly onRun: () => void) {
		super({
			name: "ping",
			description: "Test command"
		});
	}

	async run(): Promise<boolean> {
		this.onRun();
		return true;
	}

}

describe("CLI middleware execution", () => {

	test("executes command when middleware calls next", async () => {
		let middlewareExecuted = false;
		let commandExecuted = false;

		const app = new CLIApp({ exitOnError: false })
			.use(async (_flags, _ctx, next) => {
				middlewareExecuted = true;
				await next();
			})
			.register(new TestCommand(() => {
				commandExecuted = true;
			}));

		const result = await app.dispatch(["ping"], createTestContext());

		expect(result).toBe(true);
		expect(middlewareExecuted).toBe(true);
		expect(commandExecuted).toBe(true);
	});

	test("stops command execution when middleware does not call next", async () => {
		let commandExecuted = false;

		const app = new CLIApp({ exitOnError: false })
			.use(async () => {
				// intentionally stop chain
			})
			.register(new TestCommand(() => {
				commandExecuted = true;
			}));

		const result = await app.dispatch(["ping"], createTestContext());

		expect(result).toBe(false);
		expect(commandExecuted).toBe(false);
	});

});
