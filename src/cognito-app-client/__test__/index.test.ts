import { App, Stack } from "aws-cdk-lib"
import "jest-cdk-snapshot"
import { VyEnvironment } from "../../shared/types"
import type { AppClientProvider } from "../../vy-cognito-provider"
import { AppClientType, CognitoAppClient } from "../cognito-app-client"

test("cognito frontend app client", () => {
  const app = new App()
  const stack = new Stack(app, "Stack")

  const mockAppClientProvider: AppClientProvider = {
    environment: VyEnvironment.TEST,
    serviceToken: "serviceToken",
    auth_url: "auth_url",
  }

  new CognitoAppClient(stack, "CognitoAppClient", {
    appClientProvider: mockAppClientProvider,
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

  const mockAppClientProvider: AppClientProvider = {
    environment: VyEnvironment.STAGE,
    serviceToken: "serviceToken",
    auth_url: "auth_url",
  }

  new CognitoAppClient(stack, "CognitoAppClient", {
    appClientProvider: mockAppClientProvider,
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

  const mockAppClientProvider: AppClientProvider = {
    environment: VyEnvironment.PROD,
    serviceToken: "serviceToken",
    auth_url: "auth_url",
  }

  new CognitoAppClient(stack, "CognitoAppClient", {
    appClientProvider: mockAppClientProvider,
    name: "my-backend-service",
    type: AppClientType.BACKEND,
    scopes: ["https://api.vydev.io/read", "https://api.vydev.io/write"],
    secretName: "my-secret",
  })

  expect(stack).toMatchCdkSnapshot({
    ignoreAssets: true,
  })
})

test("cognito frontend app client with custom authUrlPath", () => {
  const app = new App()
  const stack = new Stack(app, "Stack")

  const mockAppClientProvider: AppClientProvider = {
    environment: VyEnvironment.TEST,
    serviceToken: "serviceToken",
    auth_url: "auth_url",
  }

  new CognitoAppClient(stack, "CognitoAppClient", {
    appClientProvider: mockAppClientProvider,
    name: "my-web-app",
    type: AppClientType.FRONTEND,
    scopes: ["email", "openid", "profile"],
    callbackUrls: ["https://my-app.vydev.io/auth/callback"],
    logoutUrls: ["https://my-app.vydev.io/logout"],
    authUrlPath: "/auth/custom-path",
  })

  expect(stack).toMatchCdkSnapshot({
    ignoreAssets: true,
  })
})
