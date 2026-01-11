import { ICLICommand } from "./command";

export interface ICLICommandGroup {



}

export class CLICommandGroup implements ICLICommandGroup {

    protected readonly registry: Record<string, ICLICommand> = {};

    constructor(
        protected readonly prefix: string = ""
    ) {

    public register(command: ICLICommand) {
        this.registry[command.name.toLowerCase()] = command;
        for (const alias of command.aliases) {
            const alias_name = typeof alias === "string" ? alias : alias.name;
            this.registry[alias_name.toLowerCase()] = command;
        }
    }

}

