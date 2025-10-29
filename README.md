# CDK constructs for the Vy internal services

Easily use internal services from Vy in CDK infrastructure code.

This is based on https://github.com/nsbno/terraform-provider-vy

## Usage

```bash
npm install @liflig/cdk-vy
```

### Create a resource server

```typescript
const resourceServer = new CognitoResourceServer(this, "ApiResourceServer", {
  environment: VyEnvironment.PROD,
  name: "my-api",
  identifier: "https://my-api.vydev.io",
  scopes: [
    { name: "read", description: "Read access to the API" },
    { name: "write", description: "Write access to the API" },
  ],
});
```

### Create an app clients

```typescript
// Backend app client for M2M authentication
const backendClient = new CognitoAppClient(this, 'BackendClient', {
  environment: VyEnvironment.TEST,
  name: 'my-backend-service',
  type: AppClientType.BACKEND,
  scopes: ['https://api.vydev.io/read', 'https://api.vydev.io/write']
});

// Access credentials
const clientId = backendClient.clientId;
const clientSecret = backendClient.clientSecret; // Stored in Secrets Manager

@example
// Frontend app client for user authentication
const frontendClient = new CognitoAppClient(this, 'FrontendClient', {
  environment: VyEnvironment.PROD,
  name: 'my-web-app',
  type: AppClientType.FRONTEND,
  scopes: ['email', 'openid', 'profile'],
  callbackUrls: ['https://my-app.vydev.io/auth/callback'],
  logoutUrls:  ['https://my-app.vydev.io/logout']
});
```
