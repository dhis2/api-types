# @dhis2/api-types

TypeScript types for the DHIS2 REST API, generated from the official OpenAPI specification.

Covers the last four supported DHIS2 API versions: **v40**, **v41**, **v42**, **v43**.

## Installation

```sh
npm install --save-dev @dhis2/api-types
```

## Usage

Import types from the version matching your DHIS2 instance:

```ts
import type { components, paths } from "@dhis2/api-types/v42"

// Named schema types
type DataElement = components["schemas"]["DataElement"]
type OrganisationUnit = components["schemas"]["OrganisationUnit"]

// Endpoint request/response types
type GetDataElementsParams = paths["/dataElements"]["get"]["parameters"]
type DataElementResponse =
    paths["/dataElements"]["get"]["responses"][200]["content"]["application/json"]
```

Pair with [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) for fully type-safe API calls:

```ts
import createClient from "openapi-fetch"
import type { paths } from "@dhis2/api-types/v42"

const client = createClient<paths>({ baseUrl: "https://play.dhis2.org/api" })

const { data } = await client.GET("/dataElements", {
    params: { query: { fields: "id,name,valueType" } },
})
```

## Available versions

| Import path          | DHIS2 version |
| -------------------- | ------------- |
| `@dhis2/api-types/v40` | DHIS2 2.40    |
| `@dhis2/api-types/v41` | DHIS2 2.41    |
| `@dhis2/api-types/v42` | DHIS2 2.42    |
| `@dhis2/api-types/v43` | DHIS2 2.43    |

## Versioning

The package major version tracks the latest included DHIS2 API version. When DHIS2 v44 ships:
- `v44` is added, `v40` is dropped
- Package version bumps to `44.x.y`

Pin to a major version to avoid unexpected API version drops:

```json
"@dhis2/api-types": "^43.0.0"
```

## Maintaining this package

### Prerequisites

Secrets required in GitHub Actions:
- `NPM_TOKEN` — npm publish token with access to the `@dhis2` org
- `DHIS2_USERNAME` / `DHIS2_PASSWORD` — credentials for the DHIS2 Play servers (defaults: `admin` / `district`)

### Updating types

Types are generated from OpenAPI spec snapshots stored in `specs/`. The specs are
fetched from DHIS2 Play servers. Never hand-edit the files in `src/`.

```sh
# Fetch fresh specs for all versions and regenerate types
npm run update

# Or step by step
npm run fetch-specs             # updates specs/vN.json
npm run generate                # regenerates src/vN.d.ts

# Target a single version
npm run fetch-specs -- --version v42 --force
npm run generate -- --version v42
```

### Releasing a new version

1. Run `npm run update` and review the diff in `specs/` and `src/`
2. Bump the version in `package.json` (`npm version patch|minor|major`)
3. Commit and push
4. Push a `v*` tag — the publish workflow handles the rest

```sh
git tag v42.1.0 && git push origin v42.1.0
```

The regenerate workflow also runs monthly on a schedule and opens a PR automatically
if any specs have changed.

### Adding a new DHIS2 API version

1. Add an entry to `scripts/versions.ts`
2. Add the matching entry to `package.json` exports and `typesVersions`
3. Remove the oldest version entry from both
4. Update the publish workflow's type check list
5. Run `npm run update`
