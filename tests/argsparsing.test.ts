import { describe, expect, test } from "bun:test";
import { CLICommandArg, CLICommandArgParser } from "@cleverjs/cli";

const spec = CLICommandArg.defineCLIArgSpecs({
    args: [
        { name: "input", type: "string", required: true, description: "Input file path" },
        { name: "output", type: "string", required: false, description: "Output file path" }
    ],
    flags: [
        { name: "verbose", shortName: "v", type: "boolean", description: "Enable verbose logging" },
        { name: "timeout", shortName: "t", type: "number", description: "Timeout in seconds", default: 30 }
        
    ]
});

describe("Argument Parsing", () => {



});