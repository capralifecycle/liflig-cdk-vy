/**
 * Lambda handler for CognitoResourceServer custom resource
 */

import {
  createFailureResponse,
  createSuccessResponse,
  handleError,
} from "../shared/custom-resource-handler"
import { createUrlFromEnvironment, signedRequest } from "../shared/sigv4-client"
import type {
  CustomResourceRequest,
  CustomResourceResponse,
  ResourceServer,
  ResourceServerUpdateRequest,
} from "../shared/types"

const COGNITO_BASE_DOMAIN =
  process.env.COGNITO_BASE_DOMAIN || "cognito.vydev.io"

interface ResourceServerProperties {
  Environment: string
  Name: string
  Identifier: string
  Scopes?: Array<{ Name: string; Description: string }>
}

async function createResourceServer(
  baseUrl: string,
  server: ResourceServer,
): Promise<ResourceServer> {
  const response = await signedRequest({
    method: "POST",
    hostname: baseUrl,
    path: "/resource-servers",
    body: JSON.stringify(server),
  })

  if (response.statusCode !== 201) {
    throw new Error(
      `Could not create resource: ${response.statusCode} - ${response.body}`,
    )
  }

  return JSON.parse(response.body)
}

async function readResourceServer(
  baseUrl: string,
  identifier: string,
): Promise<ResourceServer> {
  const encodedIdentifier = encodeURIComponent(identifier)
  const response = await signedRequest({
    method: "GET",
    hostname: baseUrl,
    path: `/resource-servers/${encodedIdentifier}`,
  })

  if (response.statusCode !== 200) {
    throw new Error(
      `Could not read resource: ${response.statusCode} - ${response.body}`,
    )
  }

  return JSON.parse(response.body)
}

async function updateResourceServer(
  baseUrl: string,
  update: ResourceServerUpdateRequest,
): Promise<void> {
  const encodedIdentifier = encodeURIComponent(update.identifier)
  const response = await signedRequest({
    method: "PUT",
    hostname: baseUrl,
    path: `/resource-servers/${encodedIdentifier}`,
    body: JSON.stringify(update),
  })

  if (response.statusCode !== 200) {
    throw new Error(
      `Could not update resource: ${response.statusCode} - ${response.body}`,
    )
  }
}

async function deleteResourceServer(
  baseUrl: string,
  identifier: string,
): Promise<void> {
  const encodedIdentifier = encodeURIComponent(identifier)
  const response = await signedRequest({
    method: "DELETE",
    hostname: baseUrl,
    path: `/resource-servers/${encodedIdentifier}`,
  })

  if (response.statusCode !== 200) {
    throw new Error(
      `Could not delete resource: ${response.statusCode} - ${response.body}`,
    )
  }
}

export async function handler(
  event: CustomResourceRequest,
): Promise<CustomResourceResponse> {
  const props = event.ResourceProperties as ResourceServerProperties
  const baseUrl = createUrlFromEnvironment(
    COGNITO_BASE_DOMAIN,
    "delegated",
    props.Environment,
  )

  try {
    switch (event.RequestType) {
      case "Create": {
        const server: ResourceServer = {
          identifier: props.Identifier,
          name: props.Name,
          scopes: props.Scopes?.map((s) => ({
            name: s.Name,
            description: s.Description,
          })),
        }

        const created = await createResourceServer(baseUrl, server)

        return createSuccessResponse(
          event.PhysicalResourceId ?? created.identifier,
          {
            Identifier: created.identifier,
            Name: created.name,
            Scopes: created.scopes,
          },
        ) as CustomResourceResponse
      }

      case "Update": {
        const update: ResourceServerUpdateRequest = {
          identifier: props.Identifier,
          name: props.Name,
          scopes: props.Scopes?.map((s) => ({
            name: s.Name,
            description: s.Description,
          })),
        }

        await updateResourceServer(baseUrl, update)
        const updated = await readResourceServer(baseUrl, props.Identifier)

        return createSuccessResponse(
          event.PhysicalResourceId ?? updated.identifier,
          {
            Identifier: updated.identifier,
            Name: updated.name,
            Scopes: updated.scopes,
          },
        ) as CustomResourceResponse
      }

      case "Delete": {
        const identifier = event.PhysicalResourceId || props.Identifier
        await deleteResourceServer(baseUrl, identifier)

        return createSuccessResponse(identifier, {}) as CustomResourceResponse
      }
    }
  } catch (error) {
    console.error("Error:", error)
    return createFailureResponse(
      event.PhysicalResourceId || props.Identifier || "unknown",
      handleError(error),
    ) as CustomResourceResponse
  }
}
