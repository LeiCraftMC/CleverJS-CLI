import { CLIBaseCommand } from "@cleverjs/cli";

export class VersionCMD extends CLIBaseCommand {

    constructor() {
        super({
            name: "version",
            description: "Show the version of the CLI app",
            aliases: ["-v"]
        });
    }

    async run(args: any) {
        console.log("Version: 1.0.0");
        return true;
    }


}
