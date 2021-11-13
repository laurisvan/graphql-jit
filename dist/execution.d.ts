import { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { DocumentNode, ExecutionResult, GraphQLError, GraphQLFieldResolver, GraphQLIsTypeOfFn, GraphQLObjectType, GraphQLOutputType, GraphQLSchema } from "graphql";
import { ExecutionContext as GraphQLContext } from "graphql/execution/execute";
import { FieldNode } from "graphql/language/ast";
import { GraphQLTypeResolver } from "graphql/type/definition";
import { Arguments, ObjectPath } from "./ast";
import { GraphQLError as GraphqlJitError } from "./error";
import { NullTrimmer } from "./non-null";
import { ResolveInfoEnricherInput } from "./resolve-info";
import { Maybe } from "./types";
import { CoercedVariableValues } from "./variables";
declare const inspect: (value: any) => string;
export interface CompilerOptions {
    customJSONSerializer: boolean;
    disableLeafSerialization: boolean;
    disablingCapturingStackErrors: boolean;
    customSerializers: {
        [key: string]: (v: any) => any;
    };
    resolverInfoEnricher?: (inp: ResolveInfoEnricherInput) => object;
}
interface ExecutionContext {
    promiseCounter: number;
    data: any;
    errors: GraphQLError[];
    nullErrors: GraphQLError[];
    resolve?: () => void;
    inspect: typeof inspect;
    variables: {
        [key: string]: any;
    };
    context: any;
    rootValue: any;
    safeMap: typeof safeMap;
    GraphQLError: typeof GraphqlJitError;
    resolvers: {
        [key: string]: GraphQLFieldResolver<any, any, any>;
    };
    trimmer: NullTrimmer;
    serializers: {
        [key: string]: (c: ExecutionContext, v: any, onError: (c: ExecutionContext, msg: string) => void) => any;
    };
    typeResolvers: {
        [key: string]: GraphQLTypeResolver<any, any>;
    };
    isTypeOfs: {
        [key: string]: GraphQLIsTypeOfFn<any, any>;
    };
    resolveInfos: {
        [key: string]: any;
    };
}
interface DeferredField {
    name: string;
    responsePath: ObjectPath;
    originPaths: string[];
    destinationPaths: string[];
    parentType: GraphQLObjectType;
    fieldName: string;
    jsFieldName: string;
    fieldType: GraphQLOutputType;
    fieldNodes: FieldNode[];
    args: Arguments;
}
/**
 * The context used during compilation.
 *
 * It stores deferred nodes to be processed later as well as the function arguments to be bounded at top level
 */
export interface CompilationContext extends GraphQLContext {
    resolvers: {
        [key: string]: GraphQLFieldResolver<any, any, any>;
    };
    serializers: {
        [key: string]: (c: ExecutionContext, v: any, onError: (c: ExecutionContext, msg: string) => void) => any;
    };
    hoistedFunctions: string[];
    hoistedFunctionNames: Map<string, number>;
    typeResolvers: {
        [key: string]: GraphQLTypeResolver<any, any>;
    };
    isTypeOfs: {
        [key: string]: GraphQLIsTypeOfFn<any, any>;
    };
    resolveInfos: {
        [key: string]: any;
    };
    deferred: DeferredField[];
    options: CompilerOptions;
    depth: number;
}
export declare const GLOBAL_VARIABLES_NAME = "__context.variables";
export interface CompiledQuery<TResult = {
    [key: string]: any;
}, TVariables = {
    [key: string]: any;
}> {
    operationName?: string;
    query: (root: any, context: any, variables: Maybe<TVariables>) => Promise<ExecutionResult<TResult>> | ExecutionResult<TResult>;
    subscribe?: (root: any, context: any, variables: Maybe<TVariables>) => Promise<AsyncIterableIterator<ExecutionResult<TResult>> | ExecutionResult<TResult>>;
    stringify: (v: any) => string;
}
/**
 * It compiles a GraphQL query to an executable function
 * @param {GraphQLSchema} schema GraphQL schema
 * @param {DocumentNode} document Query being submitted
 * @param {string} operationName name of the operation
 * @param partialOptions compilation options to tune the compiler features
 * @returns {CompiledQuery} the cacheable result
 */
export declare function compileQuery<TResult = {
    [key: string]: any;
}, TVariables = {
    [key: string]: any;
}>(schema: GraphQLSchema, document: TypedDocumentNode<TResult, TVariables>, operationName?: string, partialOptions?: Partial<CompilerOptions>): CompiledQuery<TResult, TVariables> | ExecutionResult<TResult>;
export declare function isCompiledQuery<C extends CompiledQuery, E extends ExecutionResult>(query: C | E): query is C;
export declare function createBoundQuery(compilationContext: CompilationContext, document: DocumentNode, func: (context: ExecutionContext) => Promise<any> | undefined, getVariableValues: (inputs: {
    [key: string]: any;
}) => CoercedVariableValues, operationName?: string): (rootValue: any, context: any, variables: Maybe<{
    [key: string]: any;
}>) => Promise<ExecutionResult> | ExecutionResult;
/**
 * Implements a generic map operation for any iterable.
 *
 * If the iterable is not valid, null is returned.
 * @param context
 * @param {Iterable<any> | string} iterable possible iterable
 * @param {(a: any) => any} cb callback that receives the item being iterated
 * @param idx
 * @returns {any[]} a new array with the result of the callback
 */
declare function safeMap(context: ExecutionContext, iterable: Iterable<any> | string, cb: (context: ExecutionContext, a: any, index: number, resultArray: any[], ...idx: number[]) => any, ...idx: number[]): any[];
export declare function isPromise(value: any): value is Promise<any>;
export declare function isPromiseInliner(value: string): string;
export declare function isAsyncIterable<T = unknown>(val: unknown): val is AsyncIterableIterator<T>;
export {};
