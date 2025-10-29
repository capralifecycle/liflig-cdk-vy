import { App, Stack } from "aws-cdk-lib"
import "jest-cdk-snapshot"
import { VyEnvironment } from "../../shared/types"
import { CognitoResourceServer } from "../cognito-resource-server"

test("cognito resource server", () => {
  const app = new App()
  const stack = new Stack(app, "Stack")

  new CognitoResourceServer(stack, "CognitoResourceServer", {
    environment: VyEnvironment.TEST,
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
