import { CLIBaseCommand } from "@cleverjs/cli";

export class FooCMD extends CLIBaseCommand {

    constructor() {
        super({
            name: "foo",
            description: "Command for Testing Purposes",
            aliases: [{ name: "bar", showInHelp: true }],
            args: {
                args: [
                    {
                        name: "input",
                        description: "Input value",
                        required: false,
                        type: "string"
                    }
                ],
                flags: [
                    {
                        name: "verbose",
                        shortName: "v",
                        description: "Enable verbose output",
                        type: "boolean"
                    },
                    {
                        name: "count",
                        shortName: "c",
                        description: "Number of times to execute",
                        type: "number",
                        default: 1
                    }
                ]
            }
         });
    }

    async run(args: any) {
        console.log("Foo: bar");
        return true;
    }
}