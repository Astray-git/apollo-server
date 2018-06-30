/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import { validateSchema } from 'graphql/type/validate';
import { parse } from 'graphql/language/parser';
import { validate } from 'graphql/validation/validate';
import { execute } from '../execute';
import { ObjMap } from 'graphql/jsutils/ObjMap';
import { Source } from 'graphql/language/source';
import { GraphQLFieldResolver } from 'graphql/type/definition';
import { GraphQLSchema } from 'graphql/type/schema';
import { ExecutionResult } from 'graphql/execution/execute';
import { MaybePromise } from 'graphql/jsutils/MaybePromise';

/**
 * This is the primary entry point function for fulfilling GraphQL operations
 * by parsing, validating, and executing a GraphQL document along side a
 * GraphQL schema.
 *
 * More sophisticated GraphQL servers, such as those which persist queries,
 * may wish to separate the validation and execution phases to a static time
 * tooling step, and a server runtime step.
 *
 * Accepts either an object with named arguments, or individual arguments:
 *
 * schema:
 *    The GraphQL type system to use when validating and executing a query.
 * source:
 *    A GraphQL language formatted string representing the requested operation.
 * rootValue:
 *    The value provided as the first argument to resolver functions on the top
 *    level type (e.g. the query object type).
 * variableValues:
 *    A mapping of variable name to runtime value to use for all variables
 *    defined in the requestString.
 * operationName:
 *    The name of the operation to use if requestString contains multiple
 *    possible operations. Can be omitted if requestString contains only
 *    one operation.
 * fieldResolver:
 *    A resolver function to use when one is not provided by the schema.
 *    If not provided, the default field resolver is used (which looks for a
 *    value or method on the source value with the field's name).
 */
export interface GraphQLArgs {
  schema: GraphQLSchema;
  source: string | Source;
  rootValue?: {};
  contextValue?: {};
  variableValues?: ObjMap<{}>;
  operationName?: string;
  fieldResolver?: GraphQLFieldResolver<any, any>;
}
export function graphql(GraphQLArgs, ..._: any[]): Promise<ExecutionResult>;
/* eslint-disable no-redeclare */
export function graphql(
  schema: GraphQLSchema,
  source: Source | string,
  rootValue?: {},
  contextValue?: {},
  variableValues?: ObjMap<{}>,
  operationName?: string,
  fieldResolver?: GraphQLFieldResolver<any, any>,
): Promise<ExecutionResult>;
export function graphql(
  argsOrSchema,
  source,
  rootValue,
  contextValue,
  variableValues,
  operationName,
  fieldResolver,
) {
  /* eslint-enable no-redeclare */
  // Always return a Promise for a consistent API.
  return new Promise(resolve =>
    resolve(
      // Extract arguments from object args if provided.
      arguments.length === 1
        ? graphqlImpl(
            argsOrSchema.schema,
            argsOrSchema.source,
            argsOrSchema.rootValue,
            argsOrSchema.contextValue,
            argsOrSchema.variableValues,
            argsOrSchema.operationName,
            argsOrSchema.fieldResolver,
          )
        : graphqlImpl(
            argsOrSchema,
            source,
            rootValue,
            contextValue,
            variableValues,
            operationName,
            fieldResolver,
          ),
    ),
  );
}

/**
 * The graphqlSync function also fulfills GraphQL operations by parsing,
 * validating, and executing a GraphQL document along side a GraphQL schema.
 * However, it guarantees to complete synchronously (or throw an error) assuming
 * that all field resolvers are also synchronous.
 */
export function graphqlSync(GraphQLArgs, ..._: any[]): ExecutionResult;
/* eslint-disable no-redeclare */
export function graphqlSync(
  schema: GraphQLSchema,
  source: Source | string,
  rootValue?: {},
  contextValue?: {},
  variableValues?: ObjMap<{}>,
  operationName?: string,
  fieldResolver?: GraphQLFieldResolver<any, any>,
): ExecutionResult;
export function graphqlSync(
  argsOrSchema,
  source,
  rootValue,
  contextValue,
  variableValues,
  operationName,
  fieldResolver,
) {
  // Extract arguments from object args if provided.
  const result =
    arguments.length === 1
      ? graphqlImpl(
          argsOrSchema.schema,
          argsOrSchema.source,
          argsOrSchema.rootValue,
          argsOrSchema.contextValue,
          argsOrSchema.variableValues,
          argsOrSchema.operationName,
          argsOrSchema.fieldResolver,
        )
      : graphqlImpl(
          argsOrSchema,
          source,
          rootValue,
          contextValue,
          variableValues,
          operationName,
          fieldResolver,
        );

  // Assert that the execution was synchronous.
  if (result.then) {
    throw new Error('GraphQL execution failed to complete synchronously.');
  }

  return result;
}

function graphqlImpl(
  schema,
  source,
  rootValue,
  contextValue,
  variableValues,
  operationName,
  fieldResolver,
): MaybePromise<ExecutionResult> {
  // Validate Schema
  const schemaValidationErrors = validateSchema(schema);
  if (schemaValidationErrors.length > 0) {
    return { errors: schemaValidationErrors };
  }

  // Parse
  let document;
  try {
    document = parse(source);
  } catch (syntaxError) {
    return { errors: [syntaxError] };
  }

  // Validate
  const validationErrors = validate(schema, document);
  if (validationErrors.length > 0) {
    return { errors: validationErrors };
  }

  // Execute
  return execute(
    schema,
    document,
    rootValue,
    contextValue,
    variableValues,
    operationName,
    fieldResolver,
  );
}
