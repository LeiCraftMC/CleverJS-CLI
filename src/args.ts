
export class CLICommandArgParser<SpecT extends CLICommandArg.ArgSpecDefault> {

    constructor(
        protected readonly spec: SpecT
    ) {}

    async parse(argv: string[], skipUnknownArgs: boolean = false): Promise<CLICommandArgParser.ParsingResult<SpecT>> {
        
        const resultData = await this.parseRawArgv(argv);
        if (!resultData.success) {
            return resultData;
        }

        // Check for required args and flags and apply defaults
        for (const argSpec of this.spec.args) {

            if (!(argSpec.name in resultData.data.args)) {

                if ((argSpec as any).required) {

                    return {
                        success: false,
                        data: null,
                        error: `Missing required argument: '${argSpec.name}'`
                    };

                } else if ((argSpec as any).default !== undefined && (argSpec as any).default !== null) {

                    (resultData.data.args as Record<string, any>)[argSpec.name] = (argSpec as any).default;

                } else if (argSpec.type === "boolean") {
                    // Booleans default to false
                    (resultData.data.args as Record<string, any>)[argSpec.name] = false;
                }
            }
        }

        for (const flagSpec of this.spec.flags) {

            if (!(flagSpec.name in resultData.data.flags)) {

                if ((flagSpec as any).required) {

                    return {
                        success: false,
                        data: null,
                        error: `Missing required flag: '--${flagSpec.name}'`
                    };

                } else if ((flagSpec as any).default !== undefined && (flagSpec as any).default !== null) {

                    (resultData.data.flags as Record<string, any>)[flagSpec.name] = (flagSpec as any).default;

                } else if (flagSpec.type === "boolean") {
                    // Booleans default to false
                    (resultData.data.flags as Record<string, any>)[flagSpec.name] = false;
                }
            }
        }

        return resultData;
    }

    protected async parseRawArgv(argv: string[]): Promise<CLICommandArgParser.ParsingResult<SpecT>> {
        const positionals: Record<string, string | boolean | number> = {};
        const flags: Record<string, string | boolean | number> = {};

        let index = 0;
        let positionalIndex = 0;

        while (index < argv.length) {
            const token = argv[index];

            if (token.startsWith("--")) {
                
                const eqIndex = token.indexOf("=");
                if (eqIndex !== -1) {

                    const flagName = token.substring(2, eqIndex);
                    if (flagName.length === 0) {
                        return {
                            data: null,
                            success: false,
                            error: `Invalid flag format: '${token}'`
                        }
                    }

                    const flagValue = token.substring(eqIndex + 1);

                    const spec = this.spec.flags.find(f => f.name === flagName) || this.spec.flags.find(f => f.aliases && f.aliases.includes(flagName));
                    if (!spec) {
                        return {
                            data: null,
                            success: false,
                            error: `Unknown flag '--${flagName}'`
                        }
                    }

                    if (flagValue.length === 0) {
                        return {
                            data: null,
                            success: false,
                            error: `Flag '--${flagName}' requires a value`
                        }
                    }

                    const coerced = this.coerceValue(spec, flagValue);
                    if (!coerced.success) {
                        return {
                            data: null,
                            success: false,
                            error: `Flag '--${flagName}': ${coerced.error}`
                        }
                    }
                    flags[spec.name] = coerced.value;

                } else {

                    const flagName = token.substring(2);
                    if (flagName.length === 0) {
                        return {
                            data: null,
                            success: false,
                            error: `Invalid flag format: '${token}'`
                        }
                    }

                    const spec = this.spec.flags.find(f => f.name === flagName) || this.spec.flags.find(f => f.aliases && f.aliases.includes(flagName));
                    if (!spec) {
                        return {
                            data: null,
                            success: false,
                            error: `Unknown flag '--${flagName}'`
                        }
                    }

                    if (spec.type === "boolean") {

                        flags[spec.name] = true;

                    } else {

                        const flagValue = argv[index + 1];
                        const coerced = this.coerceValue(spec, flagValue);
                        if (!coerced.success) {
                            return {
                                data: null,
                                success: false,
                                error: `Flag '--${flagName}': ${coerced.error}`
                            }
                        }
                        flags[spec.name] = coerced.value;

                        index++; // consume the value token

                    }

                }

            } else if (token.startsWith("-")) {

                const flagChars = token.substring(1).split("");
                if (flagChars.length === 0) {
                    return {
                        data: null,
                        success: false,
                        error: `Invalid flag format: '${token}'`
                    }
                }

                if (flagChars.length > 1) {
                    
                    const eqIndex = token.indexOf("=");
                    if (eqIndex !== -1) {

                        const flagChar = token.substring(1, eqIndex);
                        const flagValue = token.substring(eqIndex + 1);
                        
                        const spec = this.spec.flags.find(f => (f as any).shortName === flagChar);
                        if (!spec) {
                            return {
                                data: null,
                                success: false,
                                error: `Unknown flag '-${flagChar}'`
                            }
                        }
                        const coerced = this.coerceValue(spec, flagValue);
                        if (!coerced.success) {
                            return {
                                data: null,
                                success: false,
                                error: `Flag '-${flagChar}': ${coerced.error}`
                            }
                        }
                        flags[spec.name] = coerced.value;
                        

                    } else {
                        // Short flags combined that must be boolean

                        for (const flagChar of flagChars) {
                            const spec = this.spec.flags.find(f => (f as any).shortName === flagChar);
                            if (!spec) {
                                return {
                                    data: null,
                                    success: false,
                                    error: `Unknown flag '-${flagChar}'`
                                }
                            }
                            if (spec.type !== "boolean") {
                                return {
                                    data: null,
                                    success: false,
                                    error: `Flag '-${flagChar}' must be boolean when combined`
                                }
                            }
                            flags[spec.name] = true;
                        }
                    }

                } else {
                    
                    const flagChar = flagChars[0];
                    const spec = this.spec.flags.find(f => (f as any).shortName === flagChar);
                    if (!spec) {
                        return {
                            data: null,
                            success: false,
                            error: `Unknown flag '-${flagChar}'`
                        }
                    }
                    if (spec.type === "boolean") {

                        flags[spec.name] = true;

                    } else {

                        const flagValue = argv[index + 1];
                        const coerced = this.coerceValue(spec, flagValue);
                        if (!coerced.success) {
                            return {
                                data: null,
                                success: false,
                                error: `Flag '-${flagChar}': ${coerced.error}`
                            }
                        }
                        flags[spec.name] = coerced.value;
                        index++; // consume the value token

                    }

                }

            } else {

                // Positional argument
                const positionalSpec = this.spec.args[positionalIndex];

                if (!positionalSpec) {
                    return {
                        data: null,
                        success: false,
                        error: `Unexpected argument: '${token}'`
                    }
                }

                if ((positionalSpec as any).variadic) {
                    // consume all remaining args
                    (positionals as any)[positionalSpec.name] = argv.slice(index);
                    break;

                } else {

                    const coerced = this.coerceValue(positionalSpec, token);
                    if (!coerced.success) {
                        return {
                            data: null,
                            success: false,
                            error: `Argument '${positionalSpec.name}': ${coerced.error}`
                        }
                    }
                    positionals[positionalSpec.name] = coerced.value;

                }

                positionalIndex++;

            }

            index++;
        }

        return {
            data: {
                args: positionals as CLICommandArgParser.ParsedPositionals<SpecT['args']>,
                flags: flags as CLICommandArgParser.ParsedFlags<SpecT['flags']>
            },
            success: true,
            error: null
        }
    }

    protected coerceValue<Spec extends CLICommandArg.PositionalOrFlagSpec>(spec: Spec, value?: string): CLICommandArgParser.Utils.CoerceResult<Spec> {

        if (value === undefined || value === null || value.startsWith("-")) {
            return {
                success: false,
                value: null,
                error: `No value provided`
            };
        }

        if (value.length === 0) {
            return {
                success: false,
                value: null,
                error: `Value cannot be empty`
            };
        }

        switch (spec.type) {
            case "number": {

                const n = Number(value);
                if (Number.isNaN(n)) {
                    return {
                        success: false,
                        value: null,
                        error: `Expected number, got "${value}"`
                    };
                }

                return {
                    success: true,
                    value: n as CLICommandArg.ArgType.TypesMapping[Spec['type']],
                    error: null
                };
            }
            case "boolean": {

                return {
                    success: true,
                    value: (value.toLowerCase() === "true") as CLICommandArg.ArgType.TypesMapping[Spec['type']],
                    error: null
                };

            }
            case "enum": {

                if (!('allowedValues' in spec)) {
                    throw new Error(`Enum spec must have allowedValues`);
                }

                if (!spec.allowedValues.includes(value)) {
                    return {
                        success: false,
                        value: null,
                        error: `Expected one of [${spec.allowedValues.join(", ")}], got "${value}"`
                    };
                }

                return {
                    success: true,
                    value: value as CLICommandArg.ArgType.TypesMapping[Spec['type']],
                    error: null
                };

            }
            case "string": {
                return {
                    success: true,
                    value: value as CLICommandArg.ArgType.TypesMapping[Spec['type']],
                    error: null
                };
            }
            default:
                throw new Error(`Unsupported argument type: ${(spec as any).type}`);
        }
    }
}


export namespace CLICommandArg {

    export type ArgType = "string" | "number" | "boolean" | "enum";

    export namespace ArgType {

        export type KeyValue = "string" | "number";
        export type Boolean = "boolean";
        export type Enum = "enum";

        export type TypesMapping = {
            string: string;
            number: number;
            boolean: boolean;
            enum: string;
        };

    }
    
    export type PositionalOrFlagSpec = CLICommandArg.Flag.SpecUnion | CLICommandArg.Positional.SpecUnion;

    export interface ArgSpec<PositionalT extends CLICommandArg.Positional.SpecList, FlagsT extends CLICommandArg.Flag.SpecList> {
        args: PositionalT;
        flags: FlagsT;
    }

    export type ArgSpecDefault = ArgSpec<CLICommandArg.Positional.SpecList, CLICommandArg.Flag.SpecList>;


    export function defineCLIArgSpecs<const PositionalT extends CLICommandArg.Positional.SpecList, const FlagsT extends CLICommandArg.Flag.SpecList>(
        spec: {
            args?: PositionalT & CLICommandArg.Utils.ValidatePositionalOrder<PositionalT>
            flags?: FlagsT & CLICommandArg.Utils.ValidateFlagSpecs<FlagsT>, 
        }
    ): ArgSpec<PositionalT, FlagsT> {

        const flagNames = new Set<string>();
        const shortFlagNames = new Set<string>();

        if (spec.flags) {
            for (const flagSpec of spec.flags) {
                if (flagNames.has(flagSpec.name)) {
                    throw new Error(`Duplicate argument name detected: ${flagSpec.name}`);
                }
                if (flagSpec.shortName) {
                    if (shortFlagNames.has(flagSpec.shortName)) {
                        throw new Error(`Duplicate argument short name detected: ${flagSpec.shortName}`);
                    }
                    shortFlagNames.add(flagSpec.shortName);
                }
                flagNames.add(flagSpec.name);
            }
        }

        const argNames = new Set<string>();

        if (spec.args) {
            for (const argSpec of spec.args) {
                if (argNames.has(argSpec.name)) {
                    throw new Error(`Duplicate argument name detected: ${argSpec.name}`);
                }
                argNames.add(argSpec.name);
            }
        }

        return {
            flags: spec.flags ?? [] as any as FlagsT,
            args: spec.args ?? [] as any as PositionalT
        }
    }

}

export namespace CLICommandArg.Flag {

    export type Spec<T extends ArgType> = {
        [K in T]: K extends ArgType.KeyValue
            ? Spec.RequiredKeyValue<string, K> | Spec.OptionalKeyValue<string, K>
            : K extends "boolean"
                ? Spec.Boolean<string>
                : K extends "enum"
                    ? Spec.RequiredEnum<string, ReadonlyArray<string>> | Spec.OptionalEnum<string, ReadonlyArray<string>>
                    : never
    }[T];

    export namespace Spec {

        export interface Base<NameT extends string, TypeT extends ArgType> {
            name: NameT;
            aliases?: string[];
            type: TypeT;
            shortName?: string;
            description?: string;
        }

        export interface RequiredKeyValue<NameT extends string, TypeT extends ArgType.KeyValue> extends Base<NameT, TypeT> {
            required: true;
            default?: never;
        }

        export interface OptionalKeyValue<NameT extends string, TypeT extends ArgType.KeyValue> extends Base<NameT, TypeT> {
            required?: false;
            default?: CLICommandArg.ArgType.TypesMapping[TypeT];
        }

        export interface RequiredEnum<NameT extends string, AllowedValuesT extends ReadonlyArray<string>> extends Base<NameT, "enum"> {
            allowedValues: AllowedValuesT;
            required: true;
        }

        export interface OptionalEnum<NameT extends string, AllowedValuesT extends ReadonlyArray<string>> extends Base<NameT, "enum"> {
            allowedValues: AllowedValuesT
            // enums must be either required or have a set default when optional
            default: AllowedValuesT[number];
        }

        export interface Boolean<NameT extends string> extends Base<NameT, "boolean"> {}
    }

    export type SpecUnion = Spec<ArgType>;
    export type SpecList = ReadonlyArray<SpecUnion>;

}

export namespace CLICommandArg.Positional {

    export namespace Spec {
        export interface Base<NameT extends string, TypeT extends ArgType> {
            name: NameT;
            type: TypeT;
            description?: string;
        }
        

        export interface RequiredKeyValue<NameT extends string, TypeT extends ArgType.KeyValue> extends Base<NameT, TypeT> {
            required: true;
            default?: never;
        }

        export interface OptionalKeyValue<NameT extends string, TypeT extends ArgType.KeyValue> extends Base<NameT, TypeT> {
            required?: false;
            default?: CLICommandArg.ArgType.TypesMapping[TypeT];
        }

        export interface RequiredEnum<NameT extends string, AllowedValuesT extends ReadonlyArray<string>> extends Base<NameT, "enum"> {
            allowedValues: AllowedValuesT;
            required: true;
        }

        export interface OptionalEnum<NameT extends string, AllowedValuesT extends ReadonlyArray<string>> extends Base<NameT, "enum"> {
            allowedValues: AllowedValuesT
            // enums must be either required or have a set default when optional
            default: AllowedValuesT[number];
        }

        export interface Boolean<NameT extends string> extends Base<NameT, "boolean"> {}

        // Optional: Support for "..." arguments (rest)
        export interface Variadic<NameT extends string> extends Base<NameT, "string"> {
            variadic: true;
        }
    }

    export type Spec<T extends ArgType> = {
        [K in T]: K extends ArgType.KeyValue
            ? Spec.RequiredKeyValue<string, K> | Spec.OptionalKeyValue<string, K> | Spec.Variadic<string>
            : K extends "boolean"
                ? Spec.Boolean<string>
                : K extends "enum"
                    ? Spec.RequiredEnum<string, ReadonlyArray<string>> | Spec.OptionalEnum<string, ReadonlyArray<string>>
                    : never
    }[T];

    export type SpecUnion = Spec<ArgType>;
    export type SpecList = ReadonlyArray<SpecUnion>;

}

export namespace CLICommandArg.Utils {

    export type ValidateFlagSpecs<T extends CLICommandArg.Flag.SpecList> = {
        [K in keyof T]: T[K] extends { type: "enum", allowedValues: infer V extends ReadonlyArray<string>, default: infer D }
            ? D extends V[number]
                ? T[K] // It matches, return as is
                : `Error: Default value "${D & string}" is not in allowedValues [${V[number] & string}] for enum argument "${T[K]['name'] & string}"`
            : T[K] // Not an enum or no default, return as is
    };

    // Helper to validate Positional order (Required cannot follow Optional) & Variadic only at end
    export type ValidatePositionalOrder<T extends CLICommandArg.Positional.SpecList> = 
        T extends readonly [infer Head, ...infer Tail]
            ? Head extends { variadic: true }
                ? Tail extends []
                    ? T
                    : "Error: Variadic argument must be the last positional argument"
                : Head extends { required?: false }
                    ? Tail extends CLICommandArg.Positional.SpecList
                        ? Tail[number] extends { required: true }
                            ? "Error: Required argument cannot follow an optional argument"
                            : T
                        : T
                    : [Head, ...ValidatePositionalOrder<Tail extends CLICommandArg.Positional.SpecList ? Tail : []>]
            : T;
    
}

export namespace CLICommandArgParser {

    export type ParsedFlags<SpecsT extends ReadonlyArray<CLICommandArg.Flag.SpecUnion>> = {
        [ArgNameT in SpecsT[number]['name']]: SpecsT extends ReadonlyArray<infer SpecT>
            ? SpecT extends {
                    name: ArgNameT;
                    type: infer ArgT,
                    required?: infer IsRequiredT
                    allowedValues?: infer AllowedValuesT
                } ? ArgT extends CLICommandArg.ArgType.KeyValue

                    ? IsRequiredT extends true
                        ? CLICommandArg.ArgType.TypesMapping[ArgT]
                        : CLICommandArg.ArgType.TypesMapping[ArgT] | undefined
                    
                    : ArgT extends "boolean"
                        // Boolean args are always false by default
                        ? boolean

                        : ArgT extends "enum"
                            ? AllowedValuesT extends ReadonlyArray<string>
                                ? AllowedValuesT[number]
                                : never
                            : never
                : never
            : never;
    }

    export type ParsedPositionals<SpecsT extends CLICommandArg.Positional.SpecList> = {
        [ArgNameT in SpecsT[number]['name']]: SpecsT extends ReadonlyArray<infer SpecT>
            ? SpecT extends { name: ArgNameT }
                ? SpecT extends { variadic: true }
                    ? string[] // Variadic is always an array of strings
                    : SpecT extends {
                        name: ArgNameT;
                        type: infer ArgT,
                        required?: infer IsRequiredT
                        allowedValues?: infer AllowedValuesT
                    } ? ArgT extends CLICommandArg.ArgType.KeyValue

                        ? IsRequiredT extends true
                            ? CLICommandArg.ArgType.TypesMapping[ArgT]
                            : CLICommandArg.ArgType.TypesMapping[ArgT] | undefined
                        
                        : ArgT extends "boolean"
                            // Boolean args are always false by default
                            ? boolean

                            : ArgT extends "enum"
                                ? AllowedValuesT extends ReadonlyArray<string>
                                    ? AllowedValuesT[number]
                                    : never
                                : never
                    : never
                : never
            : never;
    };

    export type ParsedArgs<T extends CLICommandArg.ArgSpecDefault> = {
        args: ParsedPositionals<T['args']>;
        flags: ParsedFlags<T['flags']>;
    }


    export type ParsingSuccessResult<T extends CLICommandArg.ArgSpecDefault> = {
        success: true;
        data: ParsedArgs<T>;
        error: null;
    };

    export type ParsingErrorResult = {
        success: false;
        data: null;
        error: string;
    };

    export type ParsingResult<T extends CLICommandArg.ArgSpecDefault> = ParsingSuccessResult<T> | ParsingErrorResult;

}

export namespace CLICommandArgParser.Utils {

    export interface CoerceSuccessResult<Spec extends CLICommandArg.PositionalOrFlagSpec> {
        success: true;
        value: CLICommandArg.ArgType.TypesMapping[Spec['type']];
        error: null;
    }
    export interface CoerceErrorResult {
        success: false;
        value: null;
        error: string;
    }

    export type CoerceResult<Spec extends CLICommandArg.PositionalOrFlagSpec> = CoerceSuccessResult<Spec> | CoerceErrorResult;

}