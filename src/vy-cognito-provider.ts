import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"
import * as logs from "aws-cdk-lib/aws-logs"
import * as cr from "aws-cdk-lib/custom-resources"
import { Construct } from "constructs"
import type { CognitoDetails, VyEnvironment } from "./shared/types"

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface VyCognitoProviderProps {
  /**
   * The Vy Cognito environment to connect to (e.g., VyEnvironment.PROD, VyEnvironment.STAGE, VyEnvironment.TEST)
   */
  readonly environment: VyEnvironment

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

export interface AppClientProvider {
  environment: VyEnvironment
  serviceToken: string
  auth_url: string
}

export interface ResourceServerProvider {
  environment: VyEnvironment
  serviceToken: string
}

export class VyCognitoProvider extends Construct {
  public readonly environment: VyEnvironment
  public readonly cognitoBaseDomain: string
  public readonly details: CognitoDetails
  public readonly appClientProvider: AppClientProvider
  public readonly resourceServerProvider: ResourceServerProvider

  constructor(scope: Construct, id: string, props: VyCognitoProviderProps) {
    super(scope, id)

    this.environment = props.environment
    this.cognitoBaseDomain = props.cognitoBaseDomain ?? "cognito.vydev.io"
    this.details = this.getCognitoDetailsForEnvironment(this.environment)

    const appClientProvider = new LambdaProvider(this, "AppClientProvider", {
      cognitoBaseDomain: this.cognitoBaseDomain,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "handler",
      entry: require.resolve(`${__dirname}/cognito-app-client/handler`),
      logRetention: props.logsRetention,
    })

    this.appClientProvider = {
      environment: this.environment,
      serviceToken: appClientProvider.serviceToken,
      auth_url: this.details.authUrl,
    }

    const resourceServerProvider = new LambdaProvider(
      this,
      "ResourceServerProvider",
      {
        cognitoBaseDomain: this.cognitoBaseDomain,
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "handler",
        entry: require.resolve(`${__dirname}/cognito-resource-server/handler`),
        logRetention: props.logsRetention,
      },
    )

    this.resourceServerProvider = {
      environment: this.environment,
      serviceToken: resourceServerProvider.serviceToken,
    }
  }

  getCognitoDetailsForEnvironment(environment: VyEnvironment): CognitoDetails {
    const config = envConfigs[environment]

    if (!config) {
      throw new Error(
        `Unknown environment: ${environment}. Valid values are: prod, stage, test`,
      )
    }

    return config
  }
}

interface LambdaProviderProps {
  readonly cognitoBaseDomain: string
  readonly runtime: lambda.Runtime
  readonly handler: string
  readonly entry: string

  /**
   * @default cdk.Duration.minutes(2)
   */
  readonly timeout?: cdk.Duration

  /**
   * @default 256
   */
  readonly memorySize?: number

  /**
   * @default logs.RetentionDays.ONE_WEEK
   */
  readonly logRetention?: logs.RetentionDays
}

class LambdaProvider extends Construct {
  /**
   * The logGroup for the event handler lambda
   */
  public readonly lambdaLogGroup: logs.LogGroup

  /**
   * The logGroup for the custom resource provider
   */
  public readonly providerLogGroup: logs.LogGroup

  /**
   * The service token for the provider
   */
  public readonly serviceToken: string

  constructor(scope: Construct, id: string, props: LambdaProviderProps) {
    super(scope, id)

    this.lambdaLogGroup = new logs.LogGroup(this, "LambdaLogGroup", {
      retention: props.logRetention ?? logs.RetentionDays.ONE_WEEK,
    })

    this.providerLogGroup = new logs.LogGroup(this, "ProviderLogGroup", {
      retention: props.logRetention ?? logs.RetentionDays.ONE_WEEK,
    })

    const onEventHandler = new NodejsFunction(this, "OnEventHandler", {
      runtime: props.runtime,
      handler: props.handler,
      entry: props.entry,
      timeout: props.timeout ?? cdk.Duration.minutes(2),
      memorySize: props.memorySize ?? 256,
      logGroup: this.lambdaLogGroup,
      environment: {
        COGNITO_BASE_DOMAIN: props.cognitoBaseDomain,
      },
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

    const provider = new cr.Provider(this, "Provider", {
      onEventHandler,
      logGroup: this.providerLogGroup,
    })

    this.serviceToken = provider.serviceToken
  }
}

// Static config for each environment
const envConfigs: Record<string, CognitoDetails> = {
  prod: {
    authUrl: "https://auth.cognito.vydev.io",
    jwksUrl:
      "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_e6o46c1oE/.well-known/jwks.json",
    openIdUrl:
      "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_e6o46c1oE/.well-known/openid-configuration",
    issuer: "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_e6o46c1oE",
    userPoolId: "eu-west-1_e6o46c1oE",
  },
  stage: {
    authUrl: "https://auth.stage.cognito.vydev.io",
    jwksUrl:
      "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_AUYQ679zW/.well-known/jwks.json",
    openIdUrl:
      "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_AUYQ679zW/.well-known/openid-configuration",
    issuer: "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_AUYQ679zW",
    userPoolId: "eu-west-1_AUYQ679zW",
  },
  test: {
    authUrl: "https://auth.test.cognito.vydev.io",
    jwksUrl:
      "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Z53b9AbeT/.well-known/jwks.json",
    openIdUrl:
      "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Z53b9AbeT/.well-known/openid-configuration",
    issuer: "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Z53b9AbeT",
    userPoolId: "eu-west-1_Z53b9AbeT",
  },
}
