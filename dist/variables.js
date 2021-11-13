"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileVariableParsing = exports.failToParseVariables = void 0;
const generate_function_1 = __importDefault(require("generate-function"));
const graphql_1 = require("graphql");
const ast_1 = require("./ast");
const error_1 = require("./error");
const inspect_1 = __importDefault(require("./inspect"));
const inspect = (0, inspect_1.default)();
function failToParseVariables(x) {
    return x.errors;
}
exports.failToParseVariables = failToParseVariables;
function createSubCompilationContext(context) {
    return Object.assign({}, context);
}
function compileVariableParsing(schema, varDefNodes) {
    const errors = [];
    const coercedValues = Object.create(null);
    let mainBody = "";
    const dependencies = new Map();
    for (const varDefNode of varDefNodes) {
        const context = {
            varDefNode,
            depth: 0,
            inputPath: (0, ast_1.addPath)(undefined, "input"),
            responsePath: (0, ast_1.addPath)(undefined, "coerced"),
            dependencies
        };
        const varName = varDefNode.variable.name.value;
        const varType = (0, graphql_1.typeFromAST)(schema, varDefNode.type);
        if (!varType || !(0, graphql_1.isInputType)(varType)) {
            // Must use input types for variables. This should be caught during
            // validation, however is checked again here for safety.
            errors.push(new error_1.GraphQLError(`Variable "$${varName}" expected value of type ` +
                `"${varType || (0, graphql_1.print)(varDefNode.type)}" which cannot be used as an input type.`, (0, ast_1.computeLocations)([varDefNode.type])));
            continue;
        }
        // Ensure a constant shape of the input map
        coercedValues[varName] = undefined;
        const hasValueName = hasValue((0, ast_1.addPath)(context.inputPath, varName));
        mainBody += `const ${hasValueName} = Object.prototype.hasOwnProperty.call(${getObjectPath(context.inputPath)}, "${varName}");\n`;
        context.inputPath = (0, ast_1.addPath)(context.inputPath, varName);
        context.responsePath = (0, ast_1.addPath)(context.responsePath, varName);
        mainBody += generateInput(context, varType, varName, hasValueName, (0, graphql_1.valueFromAST)(varDefNode.defaultValue, varType), false);
    }
    if (errors.length > 0) {
        throw errors;
    }
    const gen = (0, generate_function_1.default)();
    gen(`
    return function getVariables(input) {
      const errors = [];
      const coerced = ${JSON.stringify(coercedValues)}
      ${mainBody}
      if (errors.length > 0) {
        return {errors, coerced: undefined};
      }
      return {errors: undefined, coerced};
    }
  `);
    // eslint-disable-next-line
    return Function.apply(null, ["GraphQLJITError", "inspect"]
        .concat(Array.from(dependencies.keys()))
        .concat(gen.toString())).apply(null, [error_1.GraphQLError, inspect].concat(Array.from(dependencies.values())));
}
exports.compileVariableParsing = compileVariableParsing;
// Int Scalars represent 32 bits
// https://graphql.github.io/graphql-spec/June2018/#sec-Int
const MAX_32BIT_INT = 2147483647;
const MIN_32BIT_INT = -2147483648;
function generateInput(context, varType, varName, hasValueName, defaultValue, wrapInList) {
    const currentOutput = getObjectPath(context.responsePath);
    const currentInput = getObjectPath(context.inputPath);
    const errorLocation = printErrorLocation((0, ast_1.computeLocations)([context.varDefNode]));
    const gen = (0, generate_function_1.default)();
    gen(`if (${currentInput} == null) {`);
    if ((0, graphql_1.isNonNullType)(varType)) {
        let nonNullMessage;
        let omittedMessage;
        if (context.errorMessage) {
            const objectPath = printObjectPath(context.responsePath);
            nonNullMessage = `${context.errorMessage} + \`Expected non-nullable type ${varType} not to be null at ${objectPath}.\``;
            omittedMessage = `${context.errorMessage} + \`Field ${objectPath} of required type ${varType} was not provided.\``;
        }
        else {
            nonNullMessage = `'Variable "$${varName}" of non-null type "${varType}" must not be null.'`;
            omittedMessage = `'Variable "$${varName}" of required type "${varType}" was not provided.'`;
        }
        varType = varType.ofType;
        gen(`
      if (${currentOutput} == null) {
        errors.push(new GraphQLJITError(${hasValueName} ? ${nonNullMessage} : ${omittedMessage}, ${errorLocation}));
      }
    `);
    }
    else {
        gen(`
      if (${hasValueName}) { ${currentOutput} = null; }
    `);
        if (defaultValue !== undefined) {
            gen(`else { ${currentOutput} = ${JSON.stringify(defaultValue)} }`);
        }
    }
    gen(`} else {`);
    if ((0, graphql_1.isScalarType)(varType)) {
        switch (varType.name) {
            case graphql_1.GraphQLID.name:
                gen(`
          if (typeof ${currentInput} === "string") {
            ${currentOutput} = ${currentInput};
          } else if (Number.isInteger(${currentInput})) {
            ${currentOutput} = ${currentInput}.toString();
          } else {
            errors.push(new GraphQLJITError('Variable "$${varName}" got invalid value ' +
              inspect(${currentInput}) + "; " +
              'Expected type ${varType.name}; ' +
              '${varType.name} cannot represent value: ' +
              inspect(${currentInput}), ${errorLocation})
            );
          }
        `);
                break;
            case graphql_1.GraphQLString.name:
                gen(`
          if (typeof ${currentInput} === "string") {
              ${currentOutput} = ${currentInput};
          } else {
            errors.push(new GraphQLJITError('Variable "$${varName}" got invalid value ' +
              inspect(${currentInput}) + "; " +
              'Expected type ${varType.name}; ' +
              '${varType.name} cannot represent a non string value: ' +
              inspect(${currentInput}), ${errorLocation})
            );
          }
        `);
                break;
            case graphql_1.GraphQLBoolean.name:
                gen(`
        if (typeof ${currentInput} === "boolean") {
            ${currentOutput} = ${currentInput};
        } else {
          errors.push(new GraphQLJITError('Variable "$${varName}" got invalid value ' +
          inspect(${currentInput}) + "; " +
          'Expected type ${varType.name}; ' +
          '${varType.name} cannot represent a non boolean value: ' +
          inspect(${currentInput}), ${errorLocation}));
        }
        `);
                break;
            case graphql_1.GraphQLInt.name:
                gen(`
        if (Number.isInteger(${currentInput})) {
          if (${currentInput} > ${MAX_32BIT_INT} || ${currentInput} < ${MIN_32BIT_INT}) {
            errors.push(new GraphQLJITError('Variable "$${varName}" got invalid value ' +
            inspect(${currentInput}) + "; " +
            'Expected type ${varType.name}; ' +
            '${varType.name} cannot represent non 32-bit signed integer value: ' +
            inspect(${currentInput}), ${errorLocation}));
          } else {
            ${currentOutput} = ${currentInput};
          }
        } else {
          errors.push(new GraphQLJITError('Variable "$${varName}" got invalid value ' +
            inspect(${currentInput}) + "; " +
            'Expected type ${varType.name}; ' +
            '${varType.name} cannot represent non-integer value: ' +
            inspect(${currentInput}), ${errorLocation})
          );
        }
        `);
                break;
            case graphql_1.GraphQLFloat.name:
                gen(`
        if (Number.isFinite(${currentInput})) {
            ${currentOutput} = ${currentInput};
        } else {
          errors.push(new GraphQLJITError('Variable "$${varName}" got invalid value ' +
            inspect(${currentInput}) + "; " +
            'Expected type ${varType.name}; ' +
            '${varType.name} cannot represent non numeric value: ' +
            inspect(${currentInput}), ${errorLocation})
          );
        }
        `);
                break;
            default:
                context.dependencies.set(`${varType.name}parseValue`, varType.parseValue.bind(varType));
                gen(`
          try {
            const parseResult = ${varType.name}parseValue(${currentInput});
            if (parseResult === undefined || parseResult !== parseResult) {
              errors.push(new GraphQLJITError('Variable "$${varName}" got invalid value ' +
              inspect(${currentInput}) + "; " +
              'Expected type ${varType.name}.', ${errorLocation}));
            }
            ${currentOutput} = parseResult;
          } catch (error) {
            errors.push(new GraphQLJITError('Variable "$${varName}" got invalid value ' +
              inspect(${currentInput}) + "; " +
              'Expected type ${varType.name}.', ${errorLocation}, undefined, error)
            );
          }
        `);
        }
    }
    else if ((0, graphql_1.isEnumType)(varType)) {
        context.dependencies.set(`${varType.name}getValue`, varType.getValue.bind(varType));
        gen(`
      if (typeof ${currentInput} === "string") {
        const enumValue = ${varType.name}getValue(${currentInput});
        if (enumValue) {
          ${currentOutput} = enumValue.value;
        } else {
          errors.push(
            new GraphQLJITError('Variable "$${varName}" got invalid value ' +
            inspect(${currentInput}) + "; " +
            'Expected type ${varType.name}.', ${errorLocation})
          );
        }
      } else {
        errors.push(
          new GraphQLJITError('Variable "$${varName}" got invalid value ' +
          inspect(${currentInput}) + "; " +
          'Expected type ${varType.name}.', ${errorLocation})
        );
      }
      `);
    }
    else if ((0, graphql_1.isListType)(varType)) {
        context.errorMessage = `'Variable "$${varName}" got invalid value ' + inspect(${currentInput}) + '; '`;
        const hasValueName = hasValue(context.inputPath);
        const index = `idx${context.depth}`;
        const subContext = createSubCompilationContext(context);
        subContext.responsePath = (0, ast_1.addPath)(subContext.responsePath, index, "variable");
        subContext.inputPath = (0, ast_1.addPath)(subContext.inputPath, index, "variable");
        subContext.depth++;
        gen(`
      if (Array.isArray(${currentInput})) {
        ${currentOutput} = [];
        for (let ${index} = 0; ${index} < ${currentInput}.length; ++${index}) {
          const ${hasValueName} =
          ${getObjectPath(subContext.inputPath)} !== undefined;
          ${generateInput(subContext, varType.ofType, varName, hasValueName, undefined, false)}
        }
      } else {
        ${generateInput(context, varType.ofType, varName, hasValueName, undefined, true)}
      }
    `);
    }
    else if ((0, graphql_1.isInputType)(varType)) {
        gen(`
      if (typeof ${currentInput} !== 'object') {
        errors.push(new GraphQLJITError('Variable "$${varName}" got invalid value ' +
        inspect(${currentInput}) + "; " +
        'Expected type ${varType.name} to be an object.', ${errorLocation}));
      } else {
        ${currentOutput} = {};
    `);
        const fields = varType.getFields();
        const allowedFields = [];
        for (const field of Object.values(fields)) {
            const subContext = createSubCompilationContext(context);
            allowedFields.push(field.name);
            const hasValueName = hasValue((0, ast_1.addPath)(subContext.inputPath, field.name));
            gen(`
        const ${hasValueName} = Object.prototype.hasOwnProperty.call(
          ${getObjectPath(subContext.inputPath)}, "${field.name}"
        );
      `);
            subContext.inputPath = (0, ast_1.addPath)(subContext.inputPath, field.name);
            subContext.responsePath = (0, ast_1.addPath)(subContext.responsePath, field.name);
            subContext.errorMessage = `'Variable "$${varName}" got invalid value ' + inspect(${currentInput}) + '; '`;
            gen(`
        ${generateInput(subContext, field.type, field.name, hasValueName, field.defaultValue, false)}
      `);
        }
        gen(`
      const allowedFields = ${JSON.stringify(allowedFields)};
      for (const fieldName of Object.keys(${currentInput})) {
        if (!allowedFields.includes(fieldName)) {
          errors.push(new GraphQLJITError('Variable "$${varName}" got invalid value ' +
            inspect(${currentInput}) + "; " +
            'Field "' + fieldName + '" is not defined by type ${varType.name}.', ${errorLocation}));
          break;
        }
      }
    }`);
    }
    else {
        /* istanbul ignore next line */
        throw new Error(`unknown type: ${varType}`);
    }
    if (wrapInList) {
        gen(`${currentOutput} = [${currentOutput}];`);
    }
    gen(`}`);
    return gen.toString();
}
function hasValue(path) {
    const flattened = [];
    let curr = path;
    while (curr) {
        flattened.push(curr.key);
        curr = curr.prev;
    }
    return `hasValue${flattened.join("_")}`;
}
function printErrorLocation(location) {
    return JSON.stringify(location);
}
function getObjectPath(path) {
    const flattened = [];
    let curr = path;
    while (curr) {
        flattened.unshift({ key: curr.key, type: curr.type });
        curr = curr.prev;
    }
    let name = flattened[0].key;
    for (let i = 1; i < flattened.length; ++i) {
        name +=
            flattened[i].type === "literal"
                ? `["${flattened[i].key}"]`
                : `[${flattened[i].key}]`;
    }
    return name;
}
function printObjectPath(path) {
    const flattened = [];
    let curr = path;
    while (curr) {
        flattened.unshift({ key: curr.key, type: curr.type });
        curr = curr.prev;
    }
    const initialIndex = Math.min(flattened.length - 1, 1);
    let name = "value";
    for (let i = initialIndex + 1; i < flattened.length; ++i) {
        name +=
            flattened[i].type === "literal"
                ? `.${flattened[i].key}`
                : `[$\{${flattened[i].key}}]`;
    }
    return name;
}
//# sourceMappingURL=variables.js.map