import { CLIApp } from '@cleverjs/cli';
import { VersionCMD } from './commands/version';
import { FooCMD } from './commands/foo';


new CLIApp()
    .register(new VersionCMD())
    .register(new FooCMD())
    .handle(process.argv.slice(2));