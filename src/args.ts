
export const CLICommandArg = function<NameT extends string, TypeT extends CLICommandArg.ArgType>(
    name: NameT,
    type: TypeT,
    required: boolean = false,
    defaultValue: CLICommandArg.ArgTypeTypesMapping[TypeT] | null = null,
    description?: string
) {

    if (required) {
        if (typeof defaultValue !== type && defaultValue !== null) {
            throw new Error(`Default value for required argument '${name}' must be of type '${type}' or null.`);
        }
    } else {
        if (defaultValue !== null && defaultValue !== undefined) {
            throw new Error(`Default value for optional argument '${name}' must be null or undefined.`);
        }
    }

    return {
        name,
        type,
        required,
        default: defaultValue,
        description
    };
} as unknown as CLICommandArgConstructor;

interface CLICommandArgConstructor {

    new <NameT extends string, TypeT extends CLICommandArg.ArgType>(
        name: NameT,
        type: TypeT,
        required?: false,
        defaultValue?: null,
        description?: string
    ): CLICommandArg.ArgSpec<TypeT>;

    new <NameT extends string, TypeT extends CLICommandArg.ArgType>(
        name: NameT,
        type: TypeT,
        required: true,
        defaultValue: CLICommandArg.ArgTypeTypesMapping[TypeT] | null,
        description?: string
    ): CLICommandArg.ArgSpec<TypeT>;
}

export class CLICommandArgParser {

    static parse<T extends CLICommandArg.ArgSpecsList>(specs: CLICommandArg.ArgSpecsList, argv: string[], skipUnknownArgs: boolean = false): CLICommandArgParser.ParsingResult<T> {
        const resultData: CLICommandArgParser.ParsedArgs<T> = {} as CLICommandArgParser.ParsedArgs<T>;
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
        } satisfies CLICommandArgParser.ParsingSuccessResult<T>;
    }

    private static coerce(type: CLICommandArgParser.ArgType, value: string): unknown {
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

    export type ArgType = "string" | "number" | "boolean";

    export type ArgTypeTypesMapping = {
        string: string;
        number: number;
        boolean: boolean;
    };

    export type ArgSpec<T extends ArgType> = {
        [K in T]: {
            name: string;
            description?: string;
            type: K;
            required: true;
            default: CLICommandArg.ArgTypeTypesMapping[K] | null;
        } | {
            name: string;
            description?: string;
            type: K;
            required?: false;
            default?: null;
        };
    }[T];

    export type ArgSpecUnion = ArgSpec<ArgType>;
    export type ArgSpecsList = ArgSpecUnion[];
}

export namespace CLICommandArgParser {

    export type ParsedArgs<SpecsT extends ReadonlyArray<CLICommandArg.ArgSpecUnion>> = {
        [ArgNameT in SpecsT[number]['name']]: SpecsT extends ReadonlyArray<infer SpecT>
            ? SpecT extends {
                    name: ArgNameT;
                    type: infer ArgT,
                    required?: infer IsRequiredT,
                    //default?: infer DefaultValueT
                } ? ArgT extends CLICommandArg.ArgType
                    ? IsRequiredT extends true
                        ? CLICommandArg.ArgTypeTypesMapping[ArgT]
                        : CLICommandArg.ArgTypeTypesMapping[ArgT] | undefined
                    : never
                : never
            : never;
    }


    export type ParsingSuccessResult<T extends CLICommandArg.ArgSpecsList> = {
        success: true;
        data: T;
        error: null;
    };

    export type ParsingErrorResult = {
        success: false;
        data: null;
        error: string;
    };

    export type ParsingResult<T extends CLICommandArg.ArgSpecsList> = ParsingSuccessResult<T> | ParsingErrorResult;

}

var TestSpec = [
    new CLICommandArg("first", "string", true, null),
    { name: "first", type: "string", required: true, default: "test" },
    { name: "second", type: "number", required: true, default: null },
    { name: "third", type: "boolean" }
] as const;

type Test = CLICommandArgParser.ParsedArgs<typeof TestSpec>;