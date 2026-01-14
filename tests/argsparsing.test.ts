import { describe, expect, test } from "bun:test";
import { CLICommandArg, CLICommandArgParser, CLIUtils } from "@cleverjs/cli";



describe("Argument Parsing for commands", () => {
    
    const spec = CLICommandArg.defineCLIArgSpecs({
        args: [
            { name: "input", type: "string", required: true, description: "Input file path" },
            { name: "output", type: "string", required: false, description: "Output file path" },

        ],
        flags: [
            { name: "verbose", shortName: "v", type: "boolean", description: "Enable verbose logging" },
            { name: "timeout", shortName: "t", type: "number", description: "Timeout in seconds", default: 30 }
            
        ]
    });

    const parser = new CLICommandArgParser(spec);

    test("should parse successfully with all arguments and flags", async () => {
    
        expect(await parser.parse(["input.txt", "output.txt", "--verbose", "--timeout=60"])).toEqual({
            success: true,
            error: null,
            data: {
                args: {
                    input: "input.txt",
                    output: "output.txt"
                },
                flags: {
                    verbose: true,
                    timeout: 60
                }
            }
        });

        // non non required args missing
        expect(await parser.parse(["input.txt"])).toEqual({
            success: true,
            error: null,
            data: {
                args: {
                    input: "input.txt",
                    output: undefined
                },
                flags: {
                    verbose: false,
                    timeout: 30
                }
            }
        });


    });

    test("should return error for missing required argument", async () => {
        
        expect(await parser.parse(["--verbose"])).toEqual({
            success: false,
            error: "Missing required argument: 'input'",
            data: null
        });

        expect(await parser.parse([])).toEqual({
            success: false,
            error: "Missing required argument: 'input'",
            data: null
        });

        expect(await parser.parse(["--timeout=45"])).toEqual({
            success: false,
            error: "Missing required argument: 'input'",
            data: null
        });

        // syntax error
        expect(await parser.parse(["input.txt", "--timeout"])).toEqual({
            success: false,
            error: "Flag '--timeout': No value provided",
            data: null
        });

        expect(await parser.parse(["input.txt", "--timeout=abc"])).toEqual({
            success: false,
            error: "Flag '--timeout': Expected number, got \"abc\"",
            data: null
        });

    });

});


describe("Argument Parsing for SubCommandGroups", () => {

    const spec = CLICommandArg.defineCLIArgSpecs({
        args: [
            { name: "input", type: "string", required: true, description: "Input file path" },
            { name: "output", type: "string", required: false, description: "Output file path" },
            { name: "rest", type: "string", required: false, description: "Rest arguments", variadic: true }
        ],
        flags: [
            { name: "verbose", shortName: "v", type: "boolean", description: "Enable verbose logging" },
            { name: "timeout", shortName: "t", type: "number", description: "Timeout in seconds", default: 30 }
            
        ]
    });

    const parser = new CLICommandArgParser(spec);

    test("should parse successfully with all arguments and flags", async () => {

        expect(await parser.parse(["input.txt", "output.txt", "--verbose", "--timeout=60", "extra1", "extra2"])).toEqual({
            success: true,
            error: null,
            data: {
                args: {
                    input: "input.txt",
                    output: "output.txt",
                    rest: ["extra1", "extra2"]
                },
                flags: {
                    verbose: true,
                    timeout: 60
                }
            }
        });

    });


    test("should return error for missing required argument", async () => {
        
        expect(await parser.parse(["--verbose"])).toEqual({
            success: false,
            error: "Missing required argument: 'input'",
            data: null
        });
    });

    test("should create valid usage string", () => {
        const usage = CLIUtils.generateUsageByArgSpec(spec);
        expect(usage).toBe("<input> [output] [--verbose|-v <value>] [--timeout|-t <value>] [rest...]");
    });

});