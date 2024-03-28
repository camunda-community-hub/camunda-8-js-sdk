# Camunda 8 JavaScript SDK

[![NPM](https://nodei.co/npm/@camunda8/sdk.png)](https://www.npmjs.com/package/@camunda8/sdk)

This is the official Camunda 8 JavaScript SDK. It is written in TypeScript and runs on Node.js. See details on why [this is not in a web browser](https://github.com/camunda-community-hub/camunda-8-js-sdk/issues/79)).

## Using the SDK in your project

Install the SDK as a dependency:

```bash
npm i @camunda8/sdk
```

## Usage

In this release, the functionality of Camunda 8 is exposed via dedicated clients for the component APIs.

```typescript
import { Camunda8 } from '@camunda8/sdk'

const c8 = new Camunda8()
const zeebe = c8.getZeebeGrpcClient()
const operate = c8.getOperateApiClient()
const optimize = c8.getOptimizeApiClient()
const tasklist = c8.getTasklistApiClient()
const modeler = c8.getModelerApiClient()
const admin = c8.getAdminApiClient()
```

## Configuration

The configuration for the SDK can be done by any combination of environment variables and explicit configuration passed to the `Camunda8` constructor.

Any configuration passed in to the `Camunda8` constructor is merged over any configuration in the environment.

The configuration object fields and the environment variables have exactly the same names. See the file `src/lib/Configuration.ts` for a complete configuration outline.

## A note on how int64 is handled in the JavaScript SDK

Entity keys in Camunda 8 are stored and represented as `int64` numbers. The range of `int64` extends to numbers that cannot be represented by the JavaScript `number` type. To deal with this, `int64` keys are serialised by the SDK to the JavaScript `string` type. See [this issue](https://github.com/camunda-community-hub/camunda-8-js-sdk/issues/78) for more details.

Some number values - for example: "_total returned results_ " - may be specified as `int64` in the API specifications. Although these numbers will usually not contain unsafe values, they are always serialised to `string`.

For `int64` values whose type is not known ahead of time, such as job variables, you can pass an annotated data transfer object (DTO) to decode them reliably. If no DTO is specified, the default behavior of the SDK is to serialise all numbers to JavaScript `number`, and if a number value is detected at a runtime that cannot be accurately stored as `number`, to throw an exception.

## OAuth

Calls to APIs are authorized using a token that is obtained via a client id/secret pair exchange, and then passes as an authorization header on API calls. The SDK handles this for you.

If your Camunda 8 platform is secured using token exchange, provide the client id and secret to the SDK.

### Disable OAuth

To disable OAuth, set the environment variable `CAMUNDA_OAUTH_DISABLED`. You can use this when running against a minimal Zeebe broker in a development environment, for example.

With this environment variable set, the SDK will inject a `NullAuthProvider` that does nothing.

### Configuring OAuth

To get a token for use with the application APIs, provide the following configuration fields at a minimum, either via the `Camunda8` constructor or in environment variables:

```bash
ZEEBE_ADDRESS
ZEEBE_CLIENT_ID
ZEEBE_CLIENT_SECRET
CAMUNDA_OAUTH_URL
```

To get a token for the Camunda SaaS Administration API or the Camunda SaaS Modeler API, set the following:

```bash
CAMUNDA_CONSOLE_CLIENT_ID
CAMUNDA_CONSOLE_CLIENT_SECRET
```

### Token caching

OAuth tokens are cached in-memory and on-disk. The disk cache is useful to prevent token endpoint saturation when restarting or rolling over workers, for example. They can all hit the cache instead of requesting new tokens.

You can turn off the disk caching by setting `CAMUNDA_TOKEN_DISK_CACHE_DISABLE` to true. This will cache tokens in-memory only.

By default, the token cache directory is `$HOME/.camunda`. You can specify a different directory by providing a full file path value for `CAMUNDA_TOKEN_CACHE_DIR`.

Here is an example of specifying a different cache directory via the constructor:

```typescript
import { Camunda8 } from '@camunda8/sdk'

const c8 = new Camunda8({
	config: {
		CAMUNDA_TOKEN_CACHE_DIR: '/tmp/cache',
	},
})
```

If the cache directory does not exist, the SDK will attempt to create it (recursively). If the SDK is unable to create it, or the directory exists but is not writeable by your application, the SDK will throw an exception.

### Token refresh

Token refresh timing relative to expiration is controlled by the `CAMUNDA_OAUTH_TOKEN_REFRESH_THRESHOLD_MS` value. By default, this is 1000ms. Tokens are renewed this amount of time before they expire.

If you experience intermittent `401: Unauthorized` errors, this may not be sufficient time to refresh the token before it expires in your infrastructure. Increase this value to force a token to be refreshed before it expires.

## Connection configuration examples

### Self-Managed

This is the complete environment configuration needed to run against the Dockerised Self-Managed stack in the `docker` subdirectory:

```bash
# Self-Managed
export ZEEBE_ADDRESS='localhost:26500'
export ZEEBE_CLIENT_ID='zeebe'
export ZEEBE_CLIENT_SECRET='zecret'
export CAMUNDA_OAUTH_URL='http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token'
export CAMUNDA_TASKLIST_BASE_URL='http://localhost:8082'
export CAMUNDA_OPERATE_BASE_URL='http://localhost:8081'
export CAMUNDA_OPTIMIZE_BASE_URL='http://localhost:8083'
export CAMUNDA_MODELER_BASE_URL='http://localhost:8070/api'

# Turn off the tenant ID, which may have been set by multi-tenant tests
# You can set this in a constructor config, or in the environment if running multi-tenant
export CAMUNDA_TENANT_ID=''

# TLS for gRPC is on by default. If the Zeebe broker is not secured by TLS, turn it off
export CAMUNDA_SECURE_CONNECTION=false
```

If you are using an OIDC that requires a `scope` parameter to be passed with the token request, set the following variable:

```
CAMUNDA_TOKEN_SCOPE
```

Here is an example of doing this via the constructor, rather than via the environment:

```typescript
import { Camunda8 } from '@camunda8/sdk'

const c8 = new Camunda8({
  config: {
    ZEEBE_ADDRESS: 'localhost:26500'
    ZEEBE_CLIENT_ID: 'zeebe'
    ZEEBE_CLIENT_SECRET: 'zecret'
    CAMUNDA_OAUTH_URL: 'http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token'
    CAMUNDA_TASKLIST_BASE_URL: 'http://localhost:8082'
    CAMUNDA_OPERATE_BASE_URL: 'http://localhost:8081'
    CAMUNDA_OPTIMIZE_BASE_URL: 'http://localhost:8083'
    CAMUNDA_MODELER_BASE_URL: 'http://localhost:8070/api'
    CAMUNDA_TENANT_ID: '' // We can override values in the env by passing an empty string value
    CAMUNDA_SECURE_CONNECTION: false
  }
})
```

### Camunda SaaS

Here is a complete configuration example for connection to Camunda SaaS:

```bash
export ZEEBE_ADDRESS='5c34c0a7-7f29-4424-8414-125615f7a9b9.syd-1.zeebe.camunda.io:443'
export ZEEBE_CLIENT_ID='yvvURO9TmBnP3zx4Xd8Ho6apgeiZTjn6'
export ZEEBE_CLIENT_SECRET='iJJu-SHgUtuJTTAMnMLdcb8WGF8s2mHfXhXutEwe8eSbLXn98vUpoxtuLk5uG0en'
# export CAMUNDA_CREDENTIALS_SCOPES='Zeebe,Tasklist,Operate,Optimize' # What APIs these client creds are authorised for
export CAMUNDA_TASKLIST_BASE_URL='https://syd-1.tasklist.camunda.io/5c34c0a7-7f29-4424-8414-125615f7a9b9'
export CAMUNDA_OPTIMIZE_BASE_URL='https://syd-1.optimize.camunda.io/5c34c0a7-7f29-4424-8414-125615f7a9b9'
export CAMUNDA_OPERATE_BASE_URL='https://syd-1.operate.camunda.io/5c34c0a7-7f29-4424-8414-125615f7a9b9'
export CAMUNDA_OAUTH_URL='https://login.cloud.camunda.io/oauth/token'

# This is on by default, but we include it in case it got turned off for local tests
export CAMUNDA_SECURE_CONNECTION=true

# Admin Console and Modeler API Client
export CAMUNDA_CONSOLE_CLIENT_ID='e-JdgKfJy9hHSXzi'
export CAMUNDA_CONSOLE_CLIENT_SECRET='DT8Pe-ANC6e3Je_ptLyzZvBNS0aFwaIV'
export CAMUNDA_CONSOLE_BASE_URL='https://api.cloud.camunda.io'
export CAMUNDA_CONSOLE_OAUTH_AUDIENCE='api.cloud.camunda.io'
```

## Debugging

The SDK uses the [`debug`](https://github.com/debug-js/debug) library. To enable debugging output, set a value for the `DEBUG` environment variable. The value is a comma-separated list of debugging namespaces. The SDK has the following namespaces:

| Value                  | Component            |
| ---------------------- | -------------------- |
| `camunda:adminconsole` | Administration API    |
| `camunda:modeler`      | Modeler API          |
| `camunda:operate`      | Operate API          |
| `camunda:optimize`     | Optimize API         |
| `camunda:tasklist`     | Tasklist API         |
| `camunda:oauth`        | OAuth Token Exchange |
| `camunda:grpc`         | Zeebe gRPC channel   |
| `camunda:worker`       | Zeebe Worker         |
| `camunda:zeebeclient`  | Zeebe Client         |

## Typing of Zeebe worker variables

The variable payload in a Zeebe worker task handler is available as an object `job.variables`. By default, this is of type `any`.

The `ZBClient.createWorker()` method accepts an `inputVariableDto` to control the parsing of number values and provide design-time type information. Passing an `inputVariableDto` class to a Zeebe worker is optional. If a DTO class is passed to the Zeebe worker, it is used for two purposes:

- To provide design-time type information on the `job.variables` object.
- To specify the parsing of JSON number fields. These can potentially represent `int64` values that cannot be represented accurately by the JavaScript `number` type. With a DTO, you can specify that a specific JSON number fields be parsed losslessly to a `string` or `BigInt`.

With no DTO specified, there is no design-time type safety. At run-time, all JSON numbers are converted to the JavaScript `number` type. If a variable field has a number value that cannot be safely represented using the JavaScript number type (a value greater than 2^53 -1), an exception is thrown.

To provide a DTO, extend the `LosslessDto` class like so:

```typescript
class MyVariableDto extends LosslessDto {
	name!: string
	maybeAge?: number
	@Int64String
	veryBigNumber!: string
	@BigIntValue
	veryBigInteger!: bigint
}
```

In this case, `veryBigNumber` is an `int64` value. It is transferred as a JSON number on the wire, but the parser will parse it into a `string` so that no loss of precision occurs. Similarly, `veryBigInteger` is a very large integer value. In this case, we direct the parser to parse this variable field as a `bigint`.

You can nest DTOs like this:

```typescript
class MyLargerDto extends LosslessDto {
	id!: string
	@ChildDto(MyVariableDto)
	entry!: MyVariableDto
}
```

## Typing of custom headers

The Zeebe worker receives custom headers as `job.customHeaders`. The `ZBClient.createWorker()` method accepts a `customHeadersDto` to control the behavior of custom header parsing of number values and provide design-time type information.

This follows the same strategy as the job variables, as previously described.
