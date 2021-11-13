import { GraphQLError, GraphQLSchema, VariableDefinitionNode } from "graphql";
interface FailedVariableCoercion {
    errors: ReadonlyArray<GraphQLError>;
}
interface VariableValues {
    coerced: {
        [key: string]: any;
    };
}
export declare type CoercedVariableValues = FailedVariableCoercion | VariableValues;
export declare function failToParseVariables(x: any): x is FailedVariableCoercion;
export declare function compileVariableParsing(schema: GraphQLSchema, varDefNodes: ReadonlyArray<VariableDefinitionNode>): (inputs: {
    [key: string]: any;
}) => CoercedVariableValues;
export {};
