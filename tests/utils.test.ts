import { describe, expect, test } from "bun:test";
import { CLICommandArg, CLIUtils } from "@cleverjs/cli";

describe("CLIUtils", () => {

    test("validates command names", () => {
        expect(CLIUtils.isValidCommandName("foo")).toBe(true);
        expect(CLIUtils.isValidCommandName("foo_bar-123")).toBe(true);
        expect(CLIUtils.isValidCommandName("foo bar")).toBe(false);
        expect(CLIUtils.isValidCommandName("foo!")) .toBe(false);
    });

    test("evaluates environment access correctly", () => {
        expect(CLIUtils.canRunInCurrentEnvironment("shell", { allowedEnvironment: "all" })).toBe(true);
        expect(CLIUtils.canRunInCurrentEnvironment("shell", { allowedEnvironment: "shell" })).toBe(true);
        expect(CLIUtils.canRunInCurrentEnvironment("shell", { allowedEnvironment: "runtime" })).toBe(false);
        expect(CLIUtils.canRunInCurrentEnvironment("runtime", { allowedEnvironment: "runtime" })).toBe(true);
        expect(CLIUtils.canRunInCurrentEnvironment("runtime", { allowedEnvironment: "shell" })).toBe(false);
    });

    test("parses parent args and split helper", () => {
        expect(CLIUtils.parseParentArgs([])).toBe("");
        expect(CLIUtils.parseParentArgs(["foo", "bar"], true)).toBe("foo bar ");

        expect(CLIUtils.splitStrNTimes("a:b:c:d", ":", 2)).toEqual(["a", "b", "c:d"]);
        expect(CLIUtils.splitStrNTimes("a:b", ":", 5)).toEqual(["a", "b"]);
    });

    test("generates usage and help lists", () => {
        const argSpec = CLICommandArg.defineCLIArgSpecs({
            args: [
                { name: "input", type: "string", required: true, description: "Input" },
                { name: "output", type: "string", description: "Output" },
                { name: "rest", type: "string", variadic: true, description: "Rest" }
            ],
            flags: [
                { name: "config", type: "string", required: true, description: "Config" },
                { name: "verbose", shortName: "v", type: "boolean", description: "Verbose" }
            ]
        });

        expect(CLIUtils.generateUsageByArgSpec(argSpec)).toBe("<input> [output] --config <value> [rest...]");
        expect(CLIUtils.generateUsageByArgSpec(argSpec, true)).toBe(" <input> [output] --config <value> [rest...]");

        const argsHelp = CLIUtils.generateArgsHelpList(argSpec);
        expect(argsHelp).toContain("input");
        expect(argsHelp).toContain("output");

        const flagsHelp = CLIUtils.generateFlagsHelpList(argSpec);
        expect(flagsHelp).toContain("--config");
        expect(flagsHelp).toContain("--verbose, -v");
    });
});
