import { CLIApp } from '@cleverjs/cli';
import { VersionCMD } from './commands/version';

class MyCliApp extends CLIApp {
    
    protected registerCommands(): void {
        this.register(new VersionCMD());
    }

    protected async run_empty(meta: any): Promise<void> {
        this.run_help(meta);
    }
    
}

new MyCliApp("shell").handle(process.argv.slice(2).join(" "));
