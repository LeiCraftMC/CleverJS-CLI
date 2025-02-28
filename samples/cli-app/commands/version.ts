import { CLICMD, CLICMDExecMeta } from "@cleverjs/cli";

export class VersionCMD extends CLICMD {
    readonly name = "version";
    readonly description = "Show the version of the CLI app";
    readonly usage = "version";
    readonly aliases = ["-v"];

    async run(args: string[], meta: CLICMDExecMeta) {
        console.log("Version: 1.0.0");
    }


}
