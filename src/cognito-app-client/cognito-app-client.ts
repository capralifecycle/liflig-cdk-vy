/**
 * CDK Construct for Cognito App Client
 */

import { createRequire } from "node:module"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as cdk from "aws-cdk-lib"
import { SecretValue } from "aws-cdk-lib"
import type * as iam from "aws-cdk-lib/aws-iam"
import type * as logs from "aws-cdk-lib/aws-logs"
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager"
import { Construct } from "constructs"
import type { AppClientProvider } from "../vy-cognito-provider"

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Type of app client
 */
export enum AppClientType {
  /**
   * Backend app client for machine-to-machine (M2M) authentication
   * Uses OAuth 2.0 Client Credentials grant type
   * Generates a client secret for authentication
   */
  BACKEND = "backend",

  /**
   * Frontend app client for user authentication
   * Uses OAuth 2.0 Authorization Code or Implicit grant types
   * Supports callback URLs and logout URLs for browser-based flows
   */
  FRONTEND = "frontend",
}

export interface CognitoAppClientProps {
  /**
   * An AppClientProvider provided from a VyCognitoProvider
   */
  readonly appClientProvider: AppClientProvider

  /**
   * The name of the app client
   * Must be unique within the environment
   */
  readonly name: string

  /**
   * The type of app client
   * - backend: Machine-to-machine authentication with client credentials
   * - frontend: User authentication with authorization code or implicit grant
   */
  readonly type: AppClientType

  /**
   * OAuth scopes for this client
   *
   * For backend clients: Use resource server scopes (e.g., 'https://api.vydev.io/read')
   * For frontend clients: Use OIDC scopes (e.g., 'email', 'openid', 'profile')
   *
   * @default - Empty array
   */
  readonly scopes?: string[]

  /**
   * Callback URLs for OAuth flows
   * Only used with frontend clients
   *
   * @default - No callback URLs
   */
  readonly callbackUrls?: string[]

  /**
   * Logout URLs for OAuth flows
   * Only used with frontend clients
   *
   * @default - No logout URLs
   */
  readonly logoutUrls?: string[]

  /**
   * Whether to generate a client secret
   * Automatically set based on type, but can be overridden
   *
   * @default - true for backend, false for frontend
   */
  readonly generateSecret?: boolean

  /**
   * Name of the secret in AWS Secrets Manager
   * Only applicable if generateSecret is true
   */
  readonly secretName?: string

  /**
   * Base domain for Cognito service
   * @default 'cognito.vydev.io'
   */
  readonly cognitoBaseDomain?: string

  /**
   * @default logs.RetentionDays.ONE_WEEK
   */
  readonly logsRetention?: logs.RetentionDays

  /**
   * @default - No path
   * Append a path to the auth_url for frontend clients.
   */
  readonly authUrlPath?: string
}

/**
 * A Cognito App Client managed through Vy's central Cognito service
 *
 * App clients are the user pool authentication resources attached to your app.
 * Use an app client to configure the permitted authentication actions for an app.
 *
 * There are two types of app clients:
 * - **Backend**: Machine-to-machine authentication using OAuth 2.0 Client Credentials
 * - **Frontend**: User authentication using OAuth 2.0 Authorization Code or Implicit Grant
 *
 * @example
 * ```typescript
 *  // Create a VyCognitoProvider
 * const vyCognitoProvider = new VyCognitoProvider(this, 'MyProvider', {
 *   environment: VyEnvironment.TEST,
 * });
 *
 * // Backend app client for M2M authentication
 * const backendClient = new CognitoAppClient(this, 'BackendClient', {
 *   appClientProvider: vyCognitoProvider.appClientProvider,
 *   name: 'my-backend-service',
 *   type: AppClientType.BACKEND,
 *   scopes: ['https://api.vydev.io/read', 'https://api.vydev.io/write']
 * });
 *
 * // Access credentials
 * const clientId = backendClient.clientId;
 * const clientSecret = backendClient.clientSecret; // Stored in Secrets Manager
 * ```
 *
 * @example
 * ```typescript
 * // Create a VyCognitoProvider
 * const vyCognitoProvider = new VyCognitoProvider(this, 'MyProvider', {
 *   environment: VyEnvironment.TEST,
 * });
 *
 * // Frontend app client for user authentication
 * const frontendClient = new CognitoAppClient(this, 'FrontendClient', {
 *   appClientProvider: vyCognitoProvider.appClientProvider,
 *   name: 'my-web-app',
 *   type: AppClientType.FRONTEND,
 *   scopes: ['email', 'openid', 'profile'],
 *   callbackUrls: ['https://my-app.vydev.io/auth/callback'],
 *   logoutUrls: ['https://my-app.vydev.io/logout']
 *   authUrlPath: '/oauth2/token'
 * });
 * ```
 */
export class CognitoAppClient extends Construct {
  /**
   * The name of the app client
   */
  public readonly name: string

  /**
   * The underlying custom resource
   */
  public readonly resource: cdk.CustomResource

  /**
   * The client ID for authentication
   */
  public readonly clientId: string

  /**
   * A reference to the client secret
   */
  public readonly clientSecretArn?: string

  /**
   * The Secrets Manager secret containing the client secret
   */
  public readonly clientSecretSecret?: secretsmanager.ISecret

  constructor(scope: Construct, id: string, props: CognitoAppClientProps) {
    super(scope, id)

    this.name = props.name

    if (
      props.type === AppClientType.FRONTEND &&
      props.callbackUrls &&
      props.callbackUrls.length === 0
    ) {
      cdk.Annotations.of(this).addWarning(
        "Frontend app clients typically require callbackUrls for OAuth flows",
      )
    }

    // props.generateSecret overrides type-specific defaults
    // Default for backend clients is true; for frontend clients false
    const generateSecret =
      props.generateSecret ?? props.type === AppClientType.BACKEND

    this.resource = new cdk.CustomResource(this, "Resource", {
      serviceToken: props.appClientProvider.serviceToken,
      properties: {
        Environment: props.appClientProvider.environment,
        Name: props.name,
        Type: props.type,
        Scopes: props.scopes || [],
        CallbackUrls: props.callbackUrls || [],
        LogoutUrls: props.logoutUrls || [],
        GenerateSecret: generateSecret,
      },
      // Force replacement if type changes
      resourceType: "Custom::VyCognitoAppClient",
    })

    const client_id = this.resource.getAttString("ClientId")
    this.clientId = client_id

    if (generateSecret) {
      const client_secret = this.resource.getAttString("ClientSecret")

      const auth_url = (
        props.authUrlPath
          ? props.appClientProvider.auth_url.concat(props.authUrlPath)
          : props.appClientProvider.auth_url
      ).replaceAll("//", "/")

      // For convenience, store auth_url, client_id, and client_secret in a single JSON secret
      const secretString = JSON.stringify({
        auth_url,
        client_id,
        client_secret,
      })

      this.clientSecretSecret = new secretsmanager.Secret(
        this,
        "ClientSecret",
        {
          secretName:
            props.secretName ??
            `/vy/${props.appClientProvider.environment}/cognito/app-client/${props.name}`,
          description: `auth_url, client_id and client_secret for Vy Cognito app client ${props.name}`,
          secretStringValue: SecretValue.unsafePlainText(secretString),
        },
      )

      this.clientSecretArn = this.clientSecretSecret.secretFullArn
    }
  }

  /**
   * Grant read access to the client secret (if it exists in Secrets Manager)
   */
  public grantReadSecret(grantee: iam.IGrantable): iam.Grant {
    if (!this.clientSecretSecret) {
      throw new Error("Client secret is not stored in Secrets Manager")
    }
    return this.clientSecretSecret.grantRead(grantee)
  }
}
