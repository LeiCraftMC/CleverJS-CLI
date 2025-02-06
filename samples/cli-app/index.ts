
import { CLIApp } from '@cleverjs/cli';
import { VersionCMD } from './commands/version';

class MyCliApp extends CLIApp {
    
    protected registerCommands(): void {
        this.register(new VersionCMD());
    }
    
}

