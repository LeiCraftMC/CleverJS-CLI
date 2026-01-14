import { CLIBaseCommand } from "@cleverjs/cli";

export class FooCMD extends CLIBaseCommand {

    constructor() {
        super({
            name: "foo",
            description: "Command for Testing Purposes",
            aliases: [{ name: "bar", showInHelp: true }]
        });
    }

    async run(args: any) {
        console.log("Foo: bar");
    }
}