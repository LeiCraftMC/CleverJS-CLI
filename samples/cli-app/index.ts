import { CLIApp } from '@cleverjs/cli';
import { VersionCMD } from './commands/version';
import { FooCMD } from './commands/foo';

class MyCliApp extends CLIApp {
    
    protected onInit(): void {
        this.register(new VersionCMD());
        this.register(new FooCMD());
    }

    protected async run_empty(meta: any): Promise<void> {
        this.run_help(meta);
    }
    
}

new MyCliApp("shell").handle(process.argv.slice(2).join(" "));
