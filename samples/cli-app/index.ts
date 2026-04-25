import { CLIApp, CLICommandArg } from '@cleverjs/cli';
import { VersionCMD } from './commands/version';
import { FooCMD } from './commands/foo';

const GLOBAL_FLAGS = CLICommandArg.defineCLIFlagSpecs([
    {
        name: "cwd",
        description: "Current working directory",
        type: "string",
        required: false,
        default: "a"
    }
]);

new CLIApp({
    globalFlags: GLOBAL_FLAGS
})

    .use(async (flags, ctx, next) => {

        console.log(flags.cwd);

        // you can modify args or ctx here before passing to next middleware/command
        return await next();

    })

    .register(new VersionCMD())
    .register(new FooCMD())
    .handle(process.argv.slice(2));
