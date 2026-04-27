import { App, Stack } from "aws-cdk-lib"
import { Annotations, Match } from "aws-cdk-lib/assertions"
import "jest-cdk-snapshot"
import { VyCognitoProvider } from "../"
import { VyEnvironment } from "../shared/types"

test("vyCognitoProvider in TEST", () => {
  const app = new App()
  const stack = new Stack(app, "Stack")

  new VyCognitoProvider(stack, "VyCognitoProvider", {
    environment: VyEnvironment.TEST,
  })

  expect(stack).toMatchCdkSnapshot({
    ignoreAssets: true,
  })
})

test("vyCognitoProvider in STAGE", () => {
  const app = new App()
  const stack = new Stack(app, "Stack")

  new VyCognitoProvider(stack, "VyCognitoProvider", {
    environment: VyEnvironment.STAGE,
  })

  expect(stack).toMatchCdkSnapshot({
    ignoreAssets: true,
  })
})

test("vyCognitoProvider in PROD", () => {
  const app = new App()
  const stack = new Stack(app, "Stack")

  new VyCognitoProvider(stack, "VyCognitoProvider", {
    environment: VyEnvironment.PROD,
  })

  expect(stack).toMatchCdkSnapshot({
    ignoreAssets: true,
  })
})

test("vyCognitoProvider with custom domain", () => {
  const app = new App()
  const stack = new Stack(app, "Stack")

  new VyCognitoProvider(stack, "VyCognitoProvider", {
    environment: VyEnvironment.TEST,
    cognitoBaseDomain: "example.com",
  })

  expect(stack).toMatchCdkSnapshot({
    ignoreAssets: true,
  })
})

test("provider lambdas do not emit aws-sdk v2 runtime warning", () => {
  const app = new App()
  const stack = new Stack(app, "Stack")

  new VyCognitoProvider(stack, "VyCognitoProvider", {
    environment: VyEnvironment.TEST,
  })

  const annotations = Annotations.fromStack(stack)
  annotations.hasNoWarning("*", Match.stringLikeRegexp(".*sdkV2NotInRuntime.*"))
  annotations.hasNoWarning(
    "*",
    Match.stringLikeRegexp(".*AWS SDK v2.*Node 16 or lower.*"),
  )
})
