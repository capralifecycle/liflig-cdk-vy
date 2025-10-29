/**
 * CDK Construct for Cognito Resource Server
 */

import { createRequire } from "node:module"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"
import * as logs from "aws-cdk-lib/aws-logs"
import * as cr from "aws-cdk-lib/custom-resources"
import { Construct } from "constructs"
import type { VyEnvironment } from "../shared/types"

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface Scope {
  /**
   * The name of the scope
   */
  readonly name: string

  /**
   * A description of what this scope is for
   */
  readonly description: string
}

export interface CognitoResourceServerProps {
  /**
   * The Vy environment to provision in (e.g., VyEnvironment.PROD, VyEnvironment.STAGE, VyEnvironment.TEST)
   */
  readonly environment: VyEnvironment

  /**
   * The name of the resource server
   */
  readonly name: string

  /**
   * The identifier for this resource server (usually a URL)
   * @example 'https://api.vydev.io'
   */
  readonly identifier: string

  /**
   * Custom scopes for this resource server
   * @default - No scopes
   */
  readonly scopes?: Scope[]

  /**
   * Base domain for Cognito service
   * @default 'cognito.vydev.io'
   */
  readonly cognitoBaseDomain?: string

  /**
   * @default logs.RetentionDays.ONE_WEEK
   */
  readonly logsRetention?: logs.RetentionDays
}

/**
 * A Cognito Resource Server managed through Vy's central Cognito service
 *
 * A resource server is an integration between a user pool and an API.
 * Each resource server has custom scopes that you must activate in your app client.
 * When you configure a resource server, your app can generate access tokens with
 * OAuth scopes that authorize read and write operations to an API server.
 *
 * @example
 * ```typescript
 * const resourceServer = new CognitoResourceServer(this, 'ApiResourceServer', {
 *   environment: VyEnvironment.PROD,
 *   name: 'my-api',
 *   identifier: 'https://my-api.vydev.io',
 *   scopes: [
 *     { name: 'read', description: 'Read access to the API' },
 *     { name: 'write', description: 'Write access to the API' }
 *   ]
 * });
 * ```
 */
export class CognitoResourceServer extends Construct {
  /**
   * The identifier of the resource server
   */
  public readonly identifier: string

  /**
   * The name of the resource server
   */
  public readonly name: string

  /**
   * The underlying custom resource
   */
  public readonly resource: cdk.CustomResource

  /**
   * The logGroup for the event handler lambda
   */
  public readonly lambdaLogGroup: logs.LogGroup

  /**
   * The logGroup for the custom resource provider
   */
  public readonly providerLogGroup: logs.LogGroup

  constructor(scope: Construct, id: string, props: CognitoResourceServerProps) {
    super(scope, id)

    this.identifier = props.identifier
    this.name = props.name

    this.lambdaLogGroup = new logs.LogGroup(this, "LambdaLogGroup", {
      retention: props.logsRetention ?? logs.RetentionDays.ONE_WEEK,
    })

    const onEventHandler = new NodejsFunction(this, "OnEventHandler", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "handler",
      entry: require.resolve(`${__dirname}/handler`),
      timeout: cdk.Duration.minutes(2),
      memorySize: 256,
      logGroup: this.lambdaLogGroup,
      environment: props.cognitoBaseDomain
        ? {
            COGNITO_BASE_DOMAIN: props.cognitoBaseDomain,
          }
        : undefined,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "es2020",
        externalModules: ["aws-sdk"],
      },
    })

    onEventHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: ["*"], // Can be scoped down if API Gateway ARN is known
      }),
    )

    this.providerLogGroup = new logs.LogGroup(this, "ProviderLogGroup", {
      retention: props.logsRetention ?? logs.RetentionDays.ONE_WEEK,
    })

    const provider = new cr.Provider(this, "Provider", {
      onEventHandler,
      logGroup: this.providerLogGroup,
    })

    this.resource = new cdk.CustomResource(this, "Resource", {
      serviceToken: provider.serviceToken,
      properties: {
        Environment: props.environment,
        Name: props.name,
        Identifier: props.identifier,
        Scopes: props.scopes?.map((s) => ({
          Name: s.name,
          Description: s.description,
        })),
      },
      resourceType: "Custom::VyCognitoResourceServer",
    })
  }

  /**
   * Get a reference to a scope in the format expected by app clients
   * @param scopeName The name of the scope
   * @returns The full scope identifier (e.g., 'https://api.vydev.io/read')
   */
  public scopeIdentifier(scopeName: string): string {
    return `${this.identifier}/${scopeName}`
  }
}
