import type { IConstruct } from "constructs"
import type { VyEnvironment } from "./shared/types"

export interface VyCognitoProviderAttributes {
  /**
   * The Vy Cognito environment to connect to (e.g., VyEnvironment.PROD, VyEnvironment.STAGE, VyEnvironment.TEST)
   */
  readonly environment: VyEnvironment

  /**
   * Base domain for Cognito service
   */
  readonly cognitoBaseDomain: string

  /**
   * Static App Client provider service token
   */
  readonly appClientProviderServiceToken: string

  /**
   * Static Resource Server provider service token
   */
  readonly resourceServerProviderServiceToken: string
}

export interface IVyCognitoProvider extends IConstruct {
  /**
   * The Vy Cognito environment to connect to (e.g., VyEnvironment.PROD, VyEnvironment.STAGE, VyEnvironment.TEST)
   */
  readonly environment: VyEnvironment

  /**
   * Base domain for Cognito service
   */
  readonly cognitoBaseDomain: string

  /**
   * Static Cognito details for this VyCognitoProvider
   */
  readonly details: any

  /**
   * Static App Client provider
   */
  readonly appClientProvider: any

  /**
   * Static Resource Server provider
   */
  readonly resourceServerProvider: any
}
