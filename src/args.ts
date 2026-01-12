
export class CLICommandArgParser {

    static parse<Specs extends CLICommandArg.CommandSpecUnion>(specs: Specs, argv: string[], skipUnknownArgs: boolean = false): CLICommandArgParser.ParsingResult<Specs> {

        if (this.hasSpecDuplicates(specs)) {
            return {
                success: false,
                data: null,
                error: "Argument specifications contain duplicate names or short names."
            } satisfies CLICommandArgParser.ParsingErrorResult;
        }
        
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

            resultData[spec.name] = this.coerce(spec.type, raw);
            index++;
        }

        return {
            success: true,
            data: resultData,
            error: null
        } satisfies CLICommandArgParser.ParsingSuccessResult<Specs>;
    }

    

    private static hasSpecDuplicates(specs: CLICommandArg.ArgSpecsList): boolean {

        const names = new Set<string>();
        const shortNames = new Set<string>();

        for (const spec of specs) {
            if (names.has(spec.name)) {
                return true;
            }
            if (spec.shortName) {
                if (shortNames.has(spec.shortName)) {
                    return true;
                }
                shortNames.add(spec.shortName);
            }
            names.add(spec.name);
        }
        return false;
    }

    private static coerce(type: CLICommandArg.ArgType, value: string): unknown {
        switch (type) {
            case "number": {
                const n = Number(value);
                if (Number.isNaN(n)) {
                    throw new Error(`Expected number, got "${value}"`);
                }
                return n;
            }
            case "boolean":
                return value === "true" || value === "1";
            case "string":
            default:
                return value;
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

    export type ArgSpec<T extends ArgType> = {
        [K in T]: K extends ArgType.KeyValue
            ? ArgSpec.RequiredKeyValue<string, K> | ArgSpec.OptionalKeyValue<string, K>
            : K extends "boolean"
                ? ArgSpec.Boolean<string>
                : K extends "enum"
                    ? ArgSpec.RequiredEnum<string, ReadonlyArray<string>> | ArgSpec.OptionalEnum<string, ReadonlyArray<string>>
                    : never
    }[T];

    export namespace ArgSpec {

        export interface Base<NameT extends string, TypeT extends ArgType> {
            name: NameT;
            type: TypeT;
            shortName?: string;
            description?: string;
        }

        export interface RequiredKeyValue<NameT extends string, TypeT extends ArgType.KeyValue> extends Base<NameT, TypeT> {
            required: true;
        }

        export interface OptionalKeyValue<NameT extends string, TypeT extends ArgType.KeyValue> extends Base<NameT, TypeT> {
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

    export type ArgSpecUnion = ArgSpec<ArgType>;
    export type ArgSpecsList = ReadonlyArray<ArgSpecUnion>;


    export namespace Positional {
        export interface Base<NameT extends string> {
            name: NameT;
            description?: string;
        }
        
        export interface Required<NameT extends string> extends Base<NameT> {
            required: true;
        }

        export interface Optional<NameT extends string> extends Base<NameT> {
            required?: false;
        }

        // Optional: Support for "..." arguments (rest)
        export interface Variadic<NameT extends string> extends Base<NameT> {
            variadic: true; 
        }

        export type Any = Required<string> | Optional<string> | Variadic<string>;
    }

    export type PositionalList = ReadonlyArray<Positional.Any>;

    // --- ROOT CONFIGURATION ---
    
    export interface CommandSpec<
        FlagsT extends ArgSpecsList,
        ArgsT extends PositionalList
    > {
        args: ArgsT;
        flags: FlagsT;
    }

    export type CommandSpecUnion = CommandSpec<ArgSpecsList, PositionalList>;

}

export namespace CLICommandArg.Utils {

    export function defineCLIArgSpecs<
        const FlagsT extends CLICommandArg.ArgSpecsList,
        const ArgsT extends CLICommandArg.PositionalList = []
    >(
        spec: {
            flags?: FlagsT & ValidateFlagSpecs<FlagsT>, 
            args?: ArgsT & ValidatePositionalOrder<ArgsT>
        }
    ): { flags: FlagsT, args: ArgsT } {
        return {
            flags: spec.flags ?? [] as any as FlagsT,
            args: spec.args ?? [] as any as ArgsT
        }
    }

    export type ValidateFlagSpecs<T extends CLICommandArg.ArgSpecsList> = {
        [K in keyof T]: T[K] extends { type: "enum", allowedValues: infer V extends ReadonlyArray<string>, default: infer D }
            ? D extends V[number]
                ? T[K] // It matches, return as is
                : Omit<T[K], "default"> & { default: V[number] } // Mismatch! Force 'default' to be the union of allowed values to trigger error
            : T[K] // Not an enum or no default, return as is
    };

    // Helper to validate Positional order (Required cannot follow Optional)
    export type ValidatePositionalOrder<T extends CLICommandArg.PositionalList> = 
        T extends readonly [infer Head, ...infer Tail]
            ? Head extends { required?: false }
                ? Tail extends CLICommandArg.PositionalList
                    ? Tail[number] extends { required: true }
                        ? "Error: Required argument cannot follow an optional argument"
                        : T
                    : T
                : [Head, ...ValidatePositionalOrder<Tail extends CLICommandArg.PositionalList ? Tail : []>]
            : T;
    
}

export namespace CLICommandArgParser {

    export type ParsedFlags<SpecsT extends ReadonlyArray<CLICommandArg.ArgSpecUnion>> = {
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

    export type ParsedPositionals<SpecsT extends CLICommandArg.PositionalList> = {
        [ArgNameT in SpecsT[number]['name']]: SpecsT extends ReadonlyArray<infer SpecT>
            ? SpecT extends { name: ArgNameT }
                ? SpecT extends { variadic: true }
                    ? string[] // Variadic is always an array of strings
                    : SpecT extends { required: true }
                        ? string
                        : string | undefined
                : never
            : never;
    };

    export type ParsedArgs<T extends {
        flags: CLICommandArg.ArgSpecsList,
        args: CLICommandArg.PositionalList
    }> = {
        args: ParsedPositionals<T['args']>;
        flags: ParsedFlags<T['flags']>;
    }


    export type ParsingSuccessResult<T extends CLICommandArg.CommandSpecUnion> = {
        success: true;
        data: ParsedArgs<T>;
        error: null;
    };

    export type ParsingErrorResult = {
        success: false;
        data: null;
        error: string;
    };

    export type ParsingResult<T extends CLICommandArg.CommandSpecUnion> = ParsingSuccessResult<T> | ParsingErrorResult;

}

const TestSpec = CLICommandArg.Utils.defineCLIArgSpecs({
    args: [
        {
            name: "inputFile",
            required: true,
            description: "Input file path"
        }
    ],
    flags: [
        { name: "reqStr", type: "string", required: true, description: "A required string argument", shortName: "s" },
        { name: "reqNum", type: "number", required: true, description: "A required number argument", shortName: "n" },

        { name: "optStr", type: "string", description: "An optional string argument", shortName: "o" },
        { name: "optNum", type: "number", description: "An optional number argument", shortName: "m" },

        { name: "optStrWithDefault", type: "string", default: "defaultString", description: "An optional string argument with default", shortName: "d" },
        { name: "optNumWithDefault", type: "number", default: 10, description: "An optional number argument with default", shortName: "f" },

        { name: "bool1", type: "boolean", description: "An boolean argument", shortName: "b" },
        { name: "bool2", type: "boolean", description: "Another boolean argument", shortName: "c" },
        
        { name: "enum", type: "enum", allowedValues: ["option1", "option2", "option3"], required: true, description: "An enum argument", shortName: "e" },
        { name: "enumWithDefault", type: "enum", allowedValues: ["option1", "option2", "option3"], default: "option1", description: "An enum argument", shortName: "e" }
    ]
});

type TestParsedResultFlags = CLICommandArgParser.ParsedArgs<typeof TestSpec>['flags'];
type TestParsedResultArgs = CLICommandArgParser.ParsedArgs<typeof TestSpec>['args'];

// things that should work:
const parseResult = CLICommandArgParser.parse(TestSpec, ["--reqStr=hello", "--reqNum=42", "--bool1"]);
const parseResult2 = CLICommandArgParser.parse(TestSpec, ["--reqStr", "world", "--reqNum", "100", "--bool2"]);
const parseResult3 = CLICommandArgParser.parse(TestSpec, ["-bc", "--reqStr=test", "--reqNum=7"]); // bools as short flags that can be combined
const parseResult4 = CLICommandArgParser.parse(TestSpec, ["-s=example", "-n", "3.14", "-b"]); // mix of short and long names

// things that should not work:
const parseResultErr1 = CLICommandArgParser.parse(TestSpec, ["--bool1=true"]); // bools represented as flags, not key=value
const parseResultErr2 = CLICommandArgParser.parse(TestSpec, ["--bool2=false"]); // bools represented as flags, not key=value
const parseResultErr3 = CLICommandArgParser.parse(TestSpec, ["--reqStr=hello"]); // missing required number argument
const parseResultErr4 = CLICommandArgParser.parse(TestSpec, ["--reqStr=hello", "--reqNum=notANumber"]); // invalid number argument
const parseResultErr5 = CLICommandArgParser.parse(TestSpec, ["-bs=value", "-n", "10"]); // non booleans short flags cannot be combined
const parseResultErr6 = CLICommandArgParser.parse(TestSpec, ["-bs", "hello", "-n", "10"]); // non booleans short flags cannot be combined

/* Returns Types:
{
    success: true,
    data: {
        reqStr: string,
        reqNum: number,
        bool1: boolean | undefined
    },
    error: null
} | {
    success: false,
    data: null,
    error: string
}
*/
