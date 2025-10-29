import { App, Stack } from "aws-cdk-lib"
import "jest-cdk-snapshot"
import { VyEnvironment } from "../../shared/types"
import type { ResourceServerProvider } from "../../vy-cognito-provider"
import { CognitoResourceServer } from "../cognito-resource-server"

test("cognito resource server", () => {
  const app = new App()
  const stack = new Stack(app, "Stack")

  const mockResourceServerProvider: ResourceServerProvider = {
    environment: VyEnvironment.TEST,
    serviceToken: "serviceToken",
  }

  new CognitoResourceServer(stack, "CognitoResourceServer", {
    resourceServerProvider: mockResourceServerProvider,
    name: "testName",
    identifier: "testIdentifier",
    scopes: [
      {
        name: "testScopeName",
        description: "testScopeDescription",
      },
    ],
  })

  expect(stack).toMatchCdkSnapshot({
    ignoreAssets: true,
  })
})
