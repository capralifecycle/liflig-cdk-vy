/**
 * Shared type definitions for Vy custom resources
 */

/**
 * The different Vy environments
 */
export enum VyEnvironment {
  /**
   * Development environment
   */
  TEST = "test",

  /**
   * Production-like environment
   */
  STAGE = "stage",

  /**
   * Production environment
   */
  PROD = "prod",
}

export interface Scope {
  name: string
  description: string
}

export interface ResourceServer {
  identifier: string
  name: string
  scopes?: Scope[]
}

export interface ResourceServerUpdateRequest {
  identifier: string
  name: string
  scopes?: Scope[]
}

export interface AppClient {
  name: string
  scopes: string[]
  type: "frontend" | "backend"
  callback_urls: string[]
  logout_urls: string[]
  generate_secret?: boolean
  client_id?: string
  client_secret?: string
}

export interface AppClientUpdateRequest {
  name: string
  scopes: string[]
  callback_urls: string[]
  logout_urls: string[]
}

export interface DeploymentAccount {
  accountId: string
  slackChannel: string
}

export interface EnvironmentAccount {
  accountId: string
  ownerAccountId: string
}

export interface ArtifactVersion {
  uri: string
  store: string
  path: string
  version: string
}

export interface CognitoDetails {
  /**
   * The URL where users can authenticate
   */
  authUrl: string

  /**
   * The URL for the /.well-known/jwks.json endpoint
   */
  jwksUrl: string

  /**
   * The URL for the /.well-known/openid-configuration endpoint
   */
  openIdUrl: string

  /**
   * The URI for the issuer
   */
  issuer: string
}

/**
 * Custom Resource event types
 */
export interface CustomResourceRequest {
  RequestType: "Create" | "Update" | "Delete"
  RequestId: string
  ResponseURL: string
  ResourceType: string
  LogicalResourceId: string
  StackId: string
  PhysicalResourceId?: string
  ResourceProperties: Record<string, any>
  OldResourceProperties?: Record<string, any>
}

export interface CustomResourceResponse {
  Status: "SUCCESS" | "FAILED"
  Reason?: string
  PhysicalResourceId: string
  StackId: string
  RequestId: string
  LogicalResourceId: string
  Data?: Record<string, any>
}
