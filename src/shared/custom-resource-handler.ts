/**
 * Base handler for Custom Resources
 * Handles the CloudFormation response protocol
 */

import type { CustomResourceResponse } from "./types"

export function createSuccessResponse(
  physicalResourceId: string,
  data?: Record<string, any>,
): Pick<CustomResourceResponse, "Status" | "PhysicalResourceId" | "Data"> {
  return {
    Status: "SUCCESS",
    PhysicalResourceId: physicalResourceId,
    Data: data,
  }
}

export function createFailureResponse(
  physicalResourceId: string,
  reason: string,
): Pick<CustomResourceResponse, "Status" | "PhysicalResourceId" | "Reason"> {
  return {
    Status: "FAILED",
    PhysicalResourceId: physicalResourceId,
    Reason: reason,
  }
}

/**
 * Base error handler for custom resource operations
 */
export function handleError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
