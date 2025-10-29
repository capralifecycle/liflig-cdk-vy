import { App, Stack } from "aws-cdk-lib"
import "jest-cdk-snapshot"
import { VyEnvironment } from "../../shared/types"
import { AppClientType, CognitoAppClient } from "../cognito-app-client"

test("cognito frontend app client", () => {
  const app = new App()
  const stack = new Stack(app, "Stack")

  new CognitoAppClient(stack, "CognitoAppClient", {
    environment: VyEnvironment.PROD,
    name: "my-web-app",
    type: AppClientType.FRONTEND,
    scopes: ["email", "openid", "profile"],
    callbackUrls: ["https://my-app.vydev.io/auth/callback"],
    logoutUrls: ["https://my-app.vydev.io/logout"],
  })

  expect(stack).toMatchCdkSnapshot({
    ignoreAssets: true,
  })
})

test("cognito backend app client", () => {
  const app = new App()
  const stack = new Stack(app, "Stack")

  new CognitoAppClient(stack, "CognitoAppClient", {
    environment: VyEnvironment.TEST,
    name: "my-backend-service",
    type: AppClientType.BACKEND,
    scopes: ["https://api.vydev.io/read", "https://api.vydev.io/write"],
  })

  expect(stack).toMatchCdkSnapshot({
    ignoreAssets: true,
  })
})

test("cognito frontend app client with custom secretName", () => {
  const app = new App()
  const stack = new Stack(app, "Stack")

  new CognitoAppClient(stack, "CognitoAppClient", {
    environment: VyEnvironment.STAGE,
    name: "my-backend-service",
    type: AppClientType.BACKEND,
    scopes: ["https://api.vydev.io/read", "https://api.vydev.io/write"],
    secretName: "my-secret",
  })

  expect(stack).toMatchCdkSnapshot({
    ignoreAssets: true,
  })
})
