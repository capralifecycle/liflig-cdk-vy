/**
 * CDK Construct for Cognito Info data source
 */

import { Construct } from "constructs"
import type { CognitoDetails, VyEnvironment } from "./shared/types"

export interface CognitoInfoProps {
  /**
   * The environment to get Cognito info for (e.g., VyEnvironment.PROD, VyEnvironment.STAGE, VyEnvironment.TEST)
   */
  readonly environment: VyEnvironment
}

/**
 * Holds information about the centralized Cognito User Pool
 *
 * Use this to reference the shared Cognito User Pool in your CDK applications without
 * hardcoding values.
 *
 * @example
 * ```typescript
 * const cognitoInfo = new CognitoInfo(this, 'CognitoInfo', {
 *   environment: VyEnvironment.PROD
 * });
 *
 * // Access authentication endpoints
 * console.log('Auth URL:', cognitoInfo.authUrl);
 * console.log('JWKS URL:', cognitoInfo.jwksUrl);
 * console.log('OpenID URL:', cognitoInfo.openIdUrl);
 * console.log('Issuer:', cognitoInfo.issuer);
 * ```
 */
export class CognitoInfo extends Construct {
  /**
   * The URL where users can authenticate
   */
  public readonly authUrl: string

  /**
   * The URL for the /.well-known/jwks.json endpoint
   */
  public readonly jwksUrl: string

  /**
   * The URL for the /.well-known/openid-configuration endpoint
   */
  public readonly openIdUrl: string

  /**
   * The URI for the issuer
   */
  public readonly issuer: string

  constructor(scope: Construct, id: string, props: CognitoInfoProps) {
    super(scope, id)

    this.authUrl = getCognitoInfo(props.environment).authUrl
    this.jwksUrl = getCognitoInfo(props.environment).jwksUrl
    this.openIdUrl = getCognitoInfo(props.environment).openIdUrl
    this.issuer = getCognitoInfo(props.environment).issuer
  }
}

function getCognitoInfo(environment: string): CognitoDetails {
  const envConfigs: Record<string, CognitoDetails> = {
    prod: {
      authUrl: "https://auth.cognito.vydev.io",
      jwksUrl:
        "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_e6o46c1oE/.well-known/jwks.json",
      openIdUrl:
        "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_e6o46c1oE/.well-known/openid-configuration",
      issuer: "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_e6o46c1oE",
    },
    stage: {
      authUrl: "https://auth.stage.cognito.vydev.io",
      jwksUrl:
        "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_AUYQ679zW/.well-known/jwks.json",
      openIdUrl:
        "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_AUYQ679zW/.well-known/openid-configuration",
      issuer: "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_AUYQ679zW",
    },
    test: {
      authUrl: "https://auth.test.cognito.vydev.io",
      jwksUrl:
        "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Z53b9AbeT/.well-known/jwks.json",
      openIdUrl:
        "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Z53b9AbeT/.well-known/openid-configuration",
      issuer: "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Z53b9AbeT",
    },
  }

  const config = envConfigs[environment]
  if (!config) {
    throw new Error(
      `Unknown environment: ${environment}. Valid values are: prod, stage, test, dev`,
    )
  }

  return config
}
