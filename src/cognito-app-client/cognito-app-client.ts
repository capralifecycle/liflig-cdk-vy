/**
 * CDK Construct for Cognito App Client
 */

import { createRequire } from "node:module"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"
import * as logs from "aws-cdk-lib/aws-logs"
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager"
import * as cr from "aws-cdk-lib/custom-resources"
import { Construct } from "constructs"
import type { VyEnvironment } from "../shared/types"

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
   * The Vy environment to provision in (e.g., VyEnvironment.PROD, VyEnvironment.STAGE, VyEnvironment.TEST)
   */
  readonly environment: VyEnvironment

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
   * Whether to store the client secret in AWS Secrets Manager
   * Only applicable if generateSecret is true
   *
   * @default true
   */
  readonly storeSecretInSecretsManager?: boolean

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
 * // Backend app client for M2M authentication
 * const backendClient = new CognitoAppClient(this, 'BackendClient', {
 *   environment: VyEnvironment.TEST,
 *   name: 'my-backend-service',
 *   type: AppClientType.BACKEND,
 *   scopes: ['https://api.vydev.io/read', 'https://api.vydev.io/write']
 * });
 *
 * // Access credentials
 * const clientId = backendClient.clientId;
 * const clientSecret = backendClient.clientSecret; // Stored in Secrets Manager
 *
 * @example
 * // Frontend app client for user authentication
 * const frontendClient = new CognitoAppClient(this, 'FrontendClient', {
 *   environment: VyEnvironment.PROD,
 *   name: 'my-web-app',
 *   type: AppClientType.FRONTEND,
 *   scopes: ['email', 'openid', 'profile'],
 *   callbackUrls: ['https://my-app.vydev.io/auth/callback'],
 *   logoutUrls: ['https://my-app.vydev.io/logout']
 * });
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
   * The logGroup for the event handler lambda
   */
  public readonly lambdaLogGroup: logs.LogGroup

  /**
   * The logGroup for the custom resource provider
   */
  public readonly providerLogGroup: logs.LogGroup

  /**
   * The client ID for authentication
   */
  public readonly clientId: string

  /**
   * The client secret (only for backend clients)
   * If storeSecretInSecretsManager is true, this returns a reference to the secret value
   */
  public readonly clientSecret?: string

  /**
   * The Secrets Manager secret containing the client secret
   * Only available if storeSecretInSecretsManager is true and type is backend
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
        Type: props.type,
        Scopes: props.scopes || [],
        CallbackUrls: props.callbackUrls || [],
        LogoutUrls: props.logoutUrls || [],
        GenerateSecret: props.generateSecret,
      },
      // Force replacement if type changes
      resourceType: "Custom::VyCognitoAppClient",
    })

    this.clientId = this.resource.getAttString("ClientId")

    const shouldStoreSecret = props.storeSecretInSecretsManager !== false
    if (props.type === AppClientType.BACKEND && shouldStoreSecret) {
      const secretValue = this.resource.getAttString("ClientSecret")

      this.clientSecretSecret = new secretsmanager.Secret(
        this,
        "ClientSecret",
        {
          secretName:
            props.secretName ??
            `vy/${props.environment}/cognito/app-client/${props.name}`,
          description: `Client secret for Vy Cognito app client ${props.name}`,
          secretStringValue: cdk.SecretValue.unsafePlainText(secretValue),
        },
      )

      this.clientSecret = this.clientSecretSecret.secretValue.unsafeUnwrap()
    } else if (props.type === AppClientType.BACKEND) {
      this.clientSecret = this.resource.getAttString("ClientSecret")
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
