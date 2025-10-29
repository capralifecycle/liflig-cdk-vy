/**
 * Shared utility for making AWS SigV4 signed HTTP requests
 */

import { Sha256 } from "@aws-crypto/sha256-js"
import { defaultProvider } from "@aws-sdk/credential-provider-node"
import { HttpRequest } from "@smithy/protocol-http"
import { SignatureV4 } from "@smithy/signature-v4"

export interface SignedRequestOptions {
  method: string
  hostname: string
  path: string
  body?: string
  headers?: Record<string, string>
  region?: string
}

export interface SignedResponse {
  statusCode: number
  body: string
  headers: Record<string, string>
}

export async function signedRequest(
  options: SignedRequestOptions,
): Promise<SignedResponse> {
  const { method, hostname, path, body, headers = {}, region } = options

  const request = new HttpRequest({
    method,
    protocol: "https:",
    hostname,
    path,
    headers: {
      "Content-Type": "application/json",
      Host: hostname,
      ...headers,
    },
    body,
  })

  const credentialsProvider = defaultProvider()
  const credentials = await credentialsProvider()

  const signer = new SignatureV4({
    credentials,
    region: region ?? "eu-west-1",
    service: "execute-api",
    sha256: Sha256,
  })

  const signedRequest = await signer.sign(request)

  const url = `https://${signedRequest.hostname}${signedRequest.path}`
  const response = await fetch(url, {
    method: signedRequest.method,
    headers: signedRequest.headers as Record<string, string>,
    body: signedRequest.body,
  })

  const responseBody = await response.text()

  return {
    statusCode: response.status,
    body: responseBody,
    headers: Object.fromEntries(response.headers.entries()),
  }
}

/**
 * Helper to create base URL from environment
 */
export function createUrlFromEnvironment(
  baseUrl: string,
  urlPrefix: string,
  environment: string,
): string {
  if (environment === "prod") {
    return `${urlPrefix}.${baseUrl}`
  }
  return `${urlPrefix}.${environment}.${baseUrl}`
}
