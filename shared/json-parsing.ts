/**
 * Lightweight JSON schema validation utilities.
 *
 * A `JsonSchemaConstraint` describes the runtime shape expected from JSON-like data. It supports primitive values,
 * arrays, string-keyed maps, fixed-shape objects with separate `required` and `optional` fields, nullable values,
 * unconstrained values (`any`), unions (`either`), accepted literal values (`valid`), and custom `validationFn`
 * callbacks. Use it when data crosses an untyped boundary such as JSON files, webhooks, external service responses,
 * database JSON blobs, or user-provided payloads.
 *
 * `TypeFromSchema<typeof schema>` derives the TypeScript type represented by a schema literal. This keeps runtime
 * validation and compile-time typing tied to the same definition, especially when schemas are declared `as const`
 * so literal `valid` values are preserved.
 *
 * Use `validateJsonSchema` when you need a non-throwing validity check with a reason and failing scope. Use
 * `safeJSONParse` when you have a JSON string and want to parse, validate, and receive the derived TypeScript type
 * or throw a useful error.
 */
export type JsonSchemaConstraint = |
    JsonSchemaConstraintNumber |
    JsonSchemaConstraintString |
    JsonSchemaConstraintBoolean |
    JsonSchemaConstraintArray |
    JsonSchemaConstraintMap |
    JsonSchemaConstraintObject |
    JsonSchemaConstraintNull |
    JsonSchemaConstraintAny |
    JsonSchemaConstraintEither;

type JsonSchemaConstraintNumber = {
    type: 'number';
    valid?: readonly number[];
    optional?: boolean;
    validationFn?: (o: number) => SchemaValidationOutputOmitScope;
};

type JsonSchemaConstraintString = {
    type: 'string';
    valid?: readonly string[];
    validationFn?: (o: string) => SchemaValidationOutputOmitScope;
};

type JsonSchemaConstraintBoolean = {
    type: 'boolean';
    valid?: readonly boolean[];
    validationFn?: (o: boolean) => SchemaValidationOutputOmitScope;
};

type JsonSchemaConstraintArray = {
    type: 'array';
    values: JsonSchemaConstraint;
    minLength?: number;
    maxLength?: number;
    validationFn?: (o: any[]) => SchemaValidationOutputOmitScope;
};

type JsonSchemaConstraintMap = {
    type: 'object';
    isMap: true;
    values: JsonSchemaConstraint | JsonSchemaConstraintRecursive;
    validationFn?: (o: object) => SchemaValidationOutputOmitScope;
};

type JsonSchemaConstraintRecursive = {
    type: 'recursive';
    base: JsonSchemaConstraint;
};

type JsonSchemaConstraintObject = {
    type: 'object';
    isMap: false;
    required?: { [ key: string ]: JsonSchemaConstraint };
    optional?: { [ key: string ]: JsonSchemaConstraint };
    allowAllKeys?: boolean;
    validationFn?: (o: object) => SchemaValidationOutputOmitScope;
};

type JsonSchemaConstraintNull = {
    type: 'null';
};

type JsonSchemaConstraintAny = {
    type: 'any';
};

type JsonSchemaConstraintEither = {
    type: 'either';
    possibleTypes: readonly JsonSchemaConstraint[];
};

type RequiredObjectTypeFromSchema<T extends JsonSchemaConstraintObject> =
    T['required'] extends { [key: string]: JsonSchemaConstraint } ? (
        { -readonly [K in keyof T['required']]: TypeFromSchema<T['required'][K]> }
    ) : Record<never, never>;

type OptionalObjectTypeFromSchema<T extends JsonSchemaConstraintObject> =
    T['optional'] extends { [key: string]: JsonSchemaConstraint } ? (
        { -readonly [K in keyof T['optional']]?: TypeFromSchema<T['optional'][K]> }
    ) : Record<never, never>;

/**
 * Utility type to derive a type directly from a JsonSchemaConstraint.
 * This allows runtime validation and compile-time typing to be tied to a single definition.
 * Example usage:
```typescript
const schema = { type: 'number', valid: [ 1, 2 ] } as const satisfies JsonSchemaConstraint;
type SomeType = TypeFromSchema<typeof schema>;
// SomeType = 1 | 2;
```
 * Note that, to avoid "Type instantiation is excessively deep and possibly infinite" errors for more complex types,
 * you'll need to use the `const x = { ... } as const satisfies JsonSchemaConstraint;` pattern shown above.
 */
export type TypeFromSchema<T extends JsonSchemaConstraint> =
    T extends JsonSchemaConstraintNumber ? (
        'valid' extends keyof T ? (T['valid'] extends readonly (infer N)[] ? N : never) : number
    ) :
    T extends JsonSchemaConstraintString ? (
        'valid' extends keyof T ? (T['valid'] extends readonly (infer N)[] ? N : never) : string
    ) :
    T extends JsonSchemaConstraintBoolean ? (
        'valid' extends keyof T ? (T['valid'] extends readonly (infer N)[] ? N : never) : boolean
    ) :
    T extends JsonSchemaConstraintArray ? (
        T['values'] extends (infer N extends JsonSchemaConstraint) ? TypeFromSchema<N>[] : never
    ) :
    T extends JsonSchemaConstraintMap ? (
        { [ key: string ]:
            T['values'] extends JsonSchemaConstraintRecursive ? TypeFromSchema<T> | TypeFromSchema<T['values']['base']> :
            T['values'] extends JsonSchemaConstraint ? TypeFromSchema<T['values']> :
            never
        }
    ) :
    T extends JsonSchemaConstraintObject ? (
        RequiredObjectTypeFromSchema<T> & OptionalObjectTypeFromSchema<T>
    ) :
    T extends JsonSchemaConstraintNull ? null :
    T extends JsonSchemaConstraintAny ? any :
    T extends JsonSchemaConstraintEither ? (
        T['possibleTypes'] extends readonly (infer N extends JsonSchemaConstraint)[] ? TypeFromSchema<N> : never
    ) :
    never;

export type SchemaValidationOutput = {
    valid: false;
    reason: string;
    scope: (string | number)[];
} | {
    valid: true;
};

export type SchemaValidationOutputOmitScope = {
    valid: false;
    reason: string;
} | {
    valid: true;
};

export type SchemaValidationOpts = {
    examineFirstArrayEntryOnly?: boolean;
    examineFirstMapEntryOnly?: boolean;
};

/**
 * Checks whether a JSON-like value adheres to a schema without throwing.
 *
 * This is useful when callers need to decide how to handle invalid data themselves, e.g. returning a validation
 * error to an API client, logging and falling back, or probing whether a payload matches one of several supported
 * formats. On failure the return value includes both a human-readable reason and the nested `scope` where validation
 * failed.
 *
 * @param schema Schema to validate against.
 * @param instance JSON-like value to validate.
 * @param opts Options for sampling large arrays or maps during format detection.
 * @returns `valid: true` if the value matches; otherwise `valid: false` with a reason and scope.
 */
export function validateJsonSchema(schema: JsonSchemaConstraint, instance: unknown, opts?: SchemaValidationOpts):
    SchemaValidationOutput {

    const validateObject = (io: unknown, constraint: JsonSchemaConstraint | undefined, scope: (string | number)[]):
        SchemaValidationOutput => {

        if (!constraint) {
            return {
                valid: true
            };
        }

        // If type 'any', do no further validation
        if (constraint.type === 'any') {
            return {
                valid: true
            };
        }

        if (constraint.type === 'null' && io === null) {
            return {
                valid: true
            };
        }

        // If type 'either', check we have any valid match
        if (constraint.type === 'either') {
            for (const possibleConstraint of constraint.possibleTypes) {
                const result = validateObject(io, possibleConstraint, scope);
                if (result.valid) {
                    return {
                        valid: true
                    };
                }
            }
            // No valid matches
            return {
                valid: false,
                reason: 'Value did not match any valid constraint',
                scope: scope
            };
        }

        // Is the root the correct type?
        const type = io === null ? 'null' : Array.isArray(io) ? 'array' : typeof io;
        if (type !== constraint.type) {
            return {
                valid: false,
                reason: `Incorrect type. Got: ${type}, expected: ${constraint.type}`,
                scope: scope
            };
        }
        // Don't allow NaN for number
        if (typeof io === 'number' && isNaN(io)) {
            return {
                valid: false,
                reason: 'Entry is NaN',
                scope,
            };
        }

        if (constraint.type === 'object' && !constraint.isMap) {
            // Validate object has required keys & values
            const rootObj = <Record<string, unknown>>io;

            // For each required key:
            for (const [ key, itemConstraint ] of Object.entries(constraint.required || { })) {
                // Examine constraint on the current value
                const entry = rootObj[key];

                // Value is required but is missing in target object
                if (typeof entry === 'undefined') {
                    return {
                        valid: false,
                        reason: `Missing value. Expected value for key: ${key}`,
                        scope: scope
                    };
                }

                // Recursively validate this value
                const entryIsValid = validateObject(entry, itemConstraint, [ ...scope, key ]);
                if (!entryIsValid.valid) {
                    return entryIsValid;
                }
            }

            // Validate optional keys that are present
            for (const [ key, itemConstraint ] of Object.entries(constraint.optional || { })) {
                const entry = rootObj[key];
                if (typeof entry === 'undefined') {
                    continue;
                }

                const entryIsValid = validateObject(entry, itemConstraint, [ ...scope, key ]);
                if (!entryIsValid.valid) {
                    return entryIsValid;
                }
            }

            // Check we have no additional (unexpected) keys when disallowed
            if (!constraint.allowAllKeys) {
                const allAllowedKeys = new Set<string>([
                    ...Object.keys(constraint.required || { }),
                    ...Object.keys(constraint.optional || { }),
                ]);
                for (const key of Object.keys(rootObj)) {
                    if (!allAllowedKeys.has(key)) {
                        return {
                            valid: false,
                            reason: `Got unexpected key: ${key}`,
                            scope: scope
                        };
                    }
                }
            }

            // Check custom validation function
            if (constraint.validationFn) {
                const validationRes = constraint.validationFn(rootObj);
                if (!validationRes.valid) {
                    return { ...validationRes, scope };
                }
            }
        }
        else if (constraint.type === 'object' && constraint.isMap) {
            // Like an 'object', only the keys can be any string, we just enforce types of values
            const rootObj = <Record<string, unknown>>io;
            // Constraint may be recursively defined; if so, reuse the parent constraint.
            const valuesConstraint: JsonSchemaConstraint = constraint.values.type === 'recursive' ? {
                type: 'either',
                possibleTypes: [ constraint, constraint.values.base ],
            } : constraint.values;

            // Recursively validate all values
            for (const [ key, value ] of Object.entries(rootObj)) {
                const entryIsValid = validateObject(value, valuesConstraint, [ ...scope, key ]);
                if (!entryIsValid.valid) {
                    return entryIsValid;
                }
                // Optionally, only validate the first entry
                if (opts && opts.examineFirstMapEntryOnly) {
                    break;
                }
            }

            // Check custom validation function
            if (constraint.validationFn) {
                const validationRes = constraint.validationFn(rootObj);
                if (!validationRes.valid) {
                    return { ...validationRes, scope };
                }
            }
        }
        else if (constraint.type === 'array') {
            // Validate array has correct types for each entry
            const rootArr = <object[]>io;

            // Validate array length
            if (typeof constraint.minLength !== 'undefined' && rootArr.length < constraint.minLength) {
                return {
                    valid: false,
                    reason: `Array contains fewer elements than expected. Got: ${rootArr.length}, expected: ${constraint.minLength}`,
                    scope: scope
                };
            }
            if (typeof constraint.maxLength !== 'undefined' && rootArr.length > constraint.maxLength) {
                return {
                    valid: false,
                    reason: `Array contains more elements than expected. Got: ${rootArr.length}, expected: ${constraint.maxLength}`,
                    scope: scope
                };
            }

            // Validate type of each entry
            for (let idx = 0; idx < rootArr.length; idx++) {
                const entryIsValid = validateObject(rootArr[idx], constraint.values, [ ...scope, idx ]);
                if (!entryIsValid.valid) {
                    return entryIsValid;
                }
                // Optionally, only validate the first entry
                if (opts && opts.examineFirstArrayEntryOnly) {
                    break;
                }
            }

            // Check custom validation function
            if (constraint.validationFn) {
                const validationRes = constraint.validationFn(rootArr);
                if (!validationRes.valid) {
                    return { ...validationRes, scope };
                }
            }
        }
        else if (constraint.type === 'number' || constraint.type === 'string' || constraint.type === 'boolean') {
            // Primitive type
            // If we have a constraint on the accepted values here, validate them
            if (constraint.valid) {
                const validEntries = (<(boolean | string | number)[]>constraint.valid).map(cv => JSON.stringify(cv));
                if (validEntries.indexOf(JSON.stringify(io)) === -1) {
                    return {
                        valid: false,
                        reason: `Invalid value. Expected value in: ${JSON.stringify(constraint.valid)}, got: ${JSON.stringify(io)}`,
                        scope: scope
                    };
                }
            }

            // Check custom validation function
            if (constraint.validationFn) {
                let validationRes: SchemaValidationOutputOmitScope | undefined;
                if (constraint.type === 'string') {
                    validationRes = constraint.validationFn(io as string);
                }
                else if (constraint.type === 'boolean') {
                    validationRes = constraint.validationFn(io as boolean);
                }
                else if (constraint.type === 'number') {
                    validationRes = constraint.validationFn(io as number);
                }
                if (validationRes && !validationRes.valid) {
                    return { ...validationRes, scope };
                }
            }
        }
        return {
            valid: true
        };
    };
    return validateObject(instance, schema, []);
}

/**
 * Parses a JSON string and validates the parsed value against a schema.
 *
 * This is useful at boundaries where a string should become a trusted, typed value in one step. If parsing or schema
 * validation fails, the function throws; otherwise the returned value is typed as `TypeFromSchema<T>`, derived from
 * the schema passed in.
 *
 * @param schema Schema to validate against.
 * @param str JSON string to parse.
 * @returns The parsed value, typed from the schema.
 * @throws If the string is not valid JSON or the parsed value does not match the schema.
 */
export function safeJSONParse<T extends JsonSchemaConstraint>(schema: T, str: string): TypeFromSchema<T> {
    const obj = JSON.parse(str) as unknown;
    const validationRes = validateJsonSchema(schema, obj);
    if (!validationRes.valid) {
        const scope = validationRes.scope.length > 0 ? validationRes.scope.join('.') : '<root>';
        throw new Error(`Invalid JSON at ${scope}: ${validationRes.reason}`);
    }
    return obj as TypeFromSchema<T>;
}
