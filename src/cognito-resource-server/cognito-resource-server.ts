/**
 * CDK Construct for Cognito Resource Server
 */

import { createRequire } from "node:module"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import type { ResourceServerProvider } from "../vy-cognito-provider"

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
   * An ResourceServerProvider provided from a VyCognitoProvider
   */
  readonly resourceServerProvider: ResourceServerProvider

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
 *  // Create a VyCognitoProvider
 * const vyCognitoProvider = new VyCognitoProvider(this, 'MyProvider', {
 *   environment: VyEnvironment.TEST,
 * });
 *
 * const resourceServer = new CognitoResourceServer(this, 'ApiResourceServer', {
 *   resourceServerProvider: vyCognitoProvider.resourceServerProvider,
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

  constructor(scope: Construct, id: string, props: CognitoResourceServerProps) {
    super(scope, id)

    this.identifier = props.identifier
    this.name = props.name

    this.resource = new cdk.CustomResource(this, "Resource", {
      serviceToken: props.resourceServerProvider.serviceToken,
      properties: {
        Environment: props.resourceServerProvider.environment,
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
