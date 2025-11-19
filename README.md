# CDK constructs for the Vy internal services

Easily use internal services from Vy in CDK infrastructure code.

This is based on https://github.com/nsbno/terraform-provider-vy

## Usage

```bash
npm install @liflig/cdk-vy
```

### Create a VyCognitoProvider

```typescript
const vyCognitoProvider = new VyCognitoProvider(this, "MyProvider", {
  environment: VyEnvironment.TEST,
});
```

### Create a resource server

```typescript
const resourceServer = new CognitoResourceServer(this, "ApiResourceServer", {
  resourceServerProvider: vyCognitoProvider.resourceServerProvider,
  name: "my-api",
  identifier: "https://my-api.vydev.io",
  scopes: [
    { name: "read", description: "Read access to the API" },
    { name: "write", description: "Write access to the API" },
  ],
});
```

### Create app clients

```typescript
// Backend app client for M2M authentication
const backendClient = new CognitoAppClient(this, "BackendClient", {
  appClientProvider: vyCognitoProvider.appClientProvider,
  name: "my-backend-service",
  type: AppClientType.BACKEND,
  scopes: ["https://api.vydev.io/read", "https://api.vydev.io/write"]
});

// Access credentials
const clientId = backendClient.clientId;
const clientSecret = backendClient.clientSecret; // Stored in Secrets Manager

@example
// Frontend app client for user authentication
const frontendClient = new CognitoAppClient(this, "FrontendClient", {
  appClientProvider: vyCognitoProvider.appClientProvider,
  name: "my-web-app",
  type: AppClientType.FRONTEND,
  scopes: ["email", "openid", "profile"],
  callbackUrls: ["https://my-app.vydev.io/auth/callback"],
  logoutUrls:  ["https://my-app.vydev.io/logout"],
  authUrlPath: "/oauth2/token"
});
```
