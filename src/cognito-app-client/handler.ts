/**
 * Lambda handler for CognitoAppClient custom resource
 */

import {
  createFailureResponse,
  createSuccessResponse,
  handleError,
} from "../shared/custom-resource-handler"
import { createUrlFromEnvironment, signedRequest } from "../shared/sigv4-client"
import type {
  AppClient,
  AppClientUpdateRequest,
  CustomResourceRequest,
  CustomResourceResponse,
} from "../shared/types"

const COGNITO_BASE_DOMAIN =
  process.env.COGNITO_BASE_DOMAIN || "cognito.vydev.io"

interface AppClientProperties {
  Environment: string
  Name: string
  Type: "frontend" | "backend"
  Scopes?: string[]
  CallbackUrls?: string[]
  LogoutUrls?: string[]
  GenerateSecret?: boolean
}

async function createAppClient(
  baseUrl: string,
  client: AppClient,
): Promise<AppClient> {
  const response = await signedRequest({
    method: "POST",
    hostname: baseUrl,
    path: "/app-clients",
    body: JSON.stringify(client),
  })

  if (response.statusCode !== 201) {
    throw new Error(
      `Could not create resource: ${response.statusCode} - ${response.body}`,
    )
  }

  return JSON.parse(response.body)
}

async function readAppClient(
  baseUrl: string,
  name: string,
): Promise<AppClient> {
  const encodedName = encodeURIComponent(name)
  const response = await signedRequest({
    method: "GET",
    hostname: baseUrl,
    path: `/app-clients/${encodedName}`,
  })

  if (response.statusCode !== 200) {
    throw new Error(
      `Could not read resource: ${response.statusCode} - ${response.body}`,
    )
  }

  return JSON.parse(response.body)
}

async function updateAppClient(
  baseUrl: string,
  update: AppClientUpdateRequest,
): Promise<void> {
  const encodedName = encodeURIComponent(update.name)
  const response = await signedRequest({
    method: "PUT",
    hostname: baseUrl,
    path: `/app-clients/${encodedName}`,
    body: JSON.stringify(update),
  })

  if (response.statusCode !== 200) {
    throw new Error(
      `Could not update resource: ${response.statusCode} - ${response.body}`,
    )
  }
}

async function deleteAppClient(baseUrl: string, name: string): Promise<void> {
  const encodedName = encodeURIComponent(name)
  const response = await signedRequest({
    method: "DELETE",
    hostname: baseUrl,
    path: `/app-clients/${encodedName}`,
  })

  if (response.statusCode !== 200) {
    const message = `Could not delete resource: ${response.statusCode} - ${response.body}`

    if (response.statusCode === 404) {
      // Allow soft fail to avoid ROLLBACK_FAILED status
      console.warn(message)
    } else {
      throw new Error(message)
    }
  }
}

export async function handler(
  event: CustomResourceRequest,
): Promise<CustomResourceResponse> {
  const props = event.ResourceProperties as AppClientProperties
  const baseUrl = createUrlFromEnvironment(
    COGNITO_BASE_DOMAIN,
    "delegated",
    props.Environment,
  )

  try {
    switch (event.RequestType) {
      case "Create": {
        // We receive a string value for GenerateSecret, but we need a boolean
        // See https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/1037
        const generate_secret: boolean =
          typeof props.GenerateSecret === "boolean"
            ? props.GenerateSecret
            : props.GenerateSecret === "true"

        const client: AppClient = {
          name: props.Name,
          type: props.Type,
          scopes: props.Scopes || [],
          callback_urls: props.CallbackUrls || [],
          logout_urls: props.LogoutUrls || [],
          generate_secret,
        }

        const created = await createAppClient(baseUrl, client)

        return createSuccessResponse(event.PhysicalResourceId ?? created.name, {
          Name: created.name,
          ClientId: created.client_id || "",
          ClientSecret: created.client_secret || "",
          Type: created.type,
        }) as CustomResourceResponse
      }

      case "Update": {
        // Check if Type changed (requires replacement)
        const oldProps = event.OldResourceProperties as AppClientProperties
        if (oldProps && oldProps.Type !== props.Type) {
          throw new Error(
            "Cannot change app client type. This requires resource replacement.",
          )
        }

        const update: AppClientUpdateRequest = {
          name: props.Name,
          scopes: props.Scopes || [],
          callback_urls: props.CallbackUrls || [],
          logout_urls: props.LogoutUrls || [],
        }

        await updateAppClient(baseUrl, update)
        const updated = await readAppClient(baseUrl, props.Name)

        return createSuccessResponse(event.PhysicalResourceId ?? updated.name, {
          Name: updated.name,
          ClientId: updated.client_id || "",
          ClientSecret: updated.client_secret || "",
          Type: updated.type,
        }) as CustomResourceResponse
      }

      case "Delete": {
        const name = event.PhysicalResourceId || props.Name
        await deleteAppClient(baseUrl, name)

        return createSuccessResponse(name, {}) as CustomResourceResponse
      }
    }
  } catch (error) {
    console.error("Error:", error)
    return createFailureResponse(
      event.PhysicalResourceId || props.Name || "unknown",
      handleError(error),
    ) as CustomResourceResponse
  }
}
