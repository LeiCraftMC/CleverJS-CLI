import { CLIBaseCommand, type CLICMDExecMeta } from "@cleverjs/cli";

export class FooCMD extends CLIBaseCommand {
    readonly name = "foo";
    readonly description = "Command for Testing Purposes";
    readonly usage = "foo";
    readonly aliases = [{ name: "bar", showInHelp: true }];

    async run(args: string[], meta: CLICMDExecMeta) {
        console.log("Foo: bar");
    }
}