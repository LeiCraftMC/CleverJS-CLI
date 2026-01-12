
export class CLICommandArgParser {

    static parse<Specs extends CLICommandArg.ArgSpecDefault>(specs: Specs, argv: string[], skipUnknownArgs: boolean = false): CLICommandArgParser.ParsingResult<Specs> {
        
        const resultData: CLICommandArgParser.ParsedArgs<Specs> = {} as CLICommandArgParser.ParsedArgs<Specs>;
        let index = 0;

        for (const spec of specs) {
            const raw = argv[index];

            if (raw === undefined) {
                if (spec.required && spec.default === undefined) {
                    return {
                        success: false,
                        data: null,
                        error: `Missing required argument: ${spec.name}`
                    } satisfies CLICommandArgParser.ParsingErrorResult;
                }
                resultData[spec.name] = spec.default;
                continue;
            }

            resultData[spec.name] = this.coerceValue(spec.type, raw);
            index++;
        }

        return {
            success: true,
            data: resultData,
            error: null
        } satisfies CLICommandArgParser.ParsingSuccessResult<Specs>;
    }

    private static coerceValue<Spec extends CLICommandArg.PositionalOrFlagSpec>(spec: Spec, value: string): CLICommandArgParser.Utils.CoerceResult<Spec> {
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

    export type ArgSpecDefault = ArgSpec<CLICommandArg.Flag.SpecList, CLICommandArg.Positional.SpecList>;


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