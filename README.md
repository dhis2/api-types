# @dhis2/api-types

TypeScript types for the DHIS2 REST API, generated from the official OpenAPI specification.

Covers the last four supported DHIS2 API versions: **v40**, **v41**, **v42**, **v43**.

## Installation

```sh
npm install --save-dev @dhis2/api-types
```

## Usage

Import types directly by name, or use the `components["schemas"]` namespace:

```ts
// Named imports — every schema in the spec is exported directly
import type { DataElement, OrganisationUnit, ValueType } from "@dhis2/api-types"

// Namespace imports — useful when you need paths/operations types too
import type { components, paths } from "@dhis2/api-types"
type DataElement = components["schemas"]["DataElement"]  // identical to the named import

// Pin to a specific DHIS2 version (default resolves to latest, currently v43)
import type { DataElement } from "@dhis2/api-types/v42"

// Endpoint request/response types (only available via namespace)
type GetDataElementsParams = paths["/dataElements"]["get"]["parameters"]
type DataElementResponse =
    paths["/dataElements"]["get"]["responses"][200]["content"]["application/json"]
```

Pair with [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) for fully type-safe API calls:

```ts
import createClient from "openapi-fetch"
import type { paths } from "@dhis2/api-types"  // paths is only in the namespace import

const client = createClient<paths>({ baseUrl: "https://play.dhis2.org/api" })

const { data } = await client.GET("/dataElements", {
    params: { query: { fields: "id,name,valueType" } },
})
```

## Utility types

Import from `@dhis2/api-types/utils` for version-agnostic helpers that work with any version's schemas.

### `GistModel<T>`

Types a response from DHIS2's `/api/*.json?type=gist` endpoint, which reduces payload size by collapsing the response:
- **Array fields** (collections) → `number` (the total count)
- **Object fields** (references and embedded objects) → `string` (the href or serialised value)
- **Scalar fields** (string, number, boolean, enums) → unchanged

```ts
import type { components } from "@dhis2/api-types/v43"
import type { GistModel } from "@dhis2/api-types/utils"

type DataElement = components["schemas"]["DataElement"]
type DataElementGist = GistModel<DataElement>

// dataElementGroups: BaseIdentifiableObject[]  →  number  (count)
// categoryCombo:     IdentifiableObject        →  string  (href)
// name:              string                    →  string  (unchanged)
// aggregationType:   AggregationType           →  AggregationType  (enum preserved)
```

### `PickWithFieldFilters<T, Filters>`

Narrows a model type to exactly the fields requested in a `?fields=` query, including nested fields using bracket notation. Each entry in the array is one top-level field specifier.

```ts
import type { components } from "@dhis2/api-types/v43"
import type { PickWithFieldFilters } from "@dhis2/api-types/utils"

type DataElement = components["schemas"]["DataElement"]

// Flat pick — mirrors ?fields=id,name,valueType
type DEFlat = PickWithFieldFilters<DataElement, ["id", "name", "valueType"]>
// → { id?: string; name?: string; valueType?: ValueType }

// Nested pick — mirrors ?fields=id,categoryCombo[id,name]
type DEWithCombo = PickWithFieldFilters<DataElement, ["id", "categoryCombo[id,name]"]>
// → { id?: string; categoryCombo?: { id?: string; name?: string } }

// Array field nested pick — mirrors ?fields=status,dataValues[dataElement,value]
type EventPick = PickWithFieldFilters<
    components["schemas"]["Event"],
    ["status", "dataValues[dataElement,value]"]
>
// → { status: EventStatus; dataValues?: Array<{ dataElement?: string; value?: string }> }
```

> **Note:** Nested picks only resolve fields that exist on the declared type. Reference fields like `categoryCombo` are typed as `IdentifiableObject` (with `id`, `name`, `code`, etc.), not the full concrete type. Deeper fields unavailable on `IdentifiableObject` (e.g. `categories` within a `CategoryCombo`) are silently dropped. See [ADR 0001](docs/adr/0001-openapi-generated-types-over-resolved-types.md) for background.

## Available versions

| Import path            | DHIS2 version          |
| ---------------------- | ---------------------- |
| `@dhis2/api-types`     | DHIS2 2.43 (latest)    |
| `@dhis2/api-types/v43` | DHIS2 2.43             |
| `@dhis2/api-types/v42` | DHIS2 2.42             |
| `@dhis2/api-types/v41` | DHIS2 2.41             |
| `@dhis2/api-types/v40` | DHIS2 2.40             |

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
git tag v43.1.0 && git push origin v43.1.0
```

The regenerate workflow also runs monthly on a schedule and opens a PR automatically
if any specs have changed.

### Adding a new DHIS2 API version

1. Add an entry to `scripts/versions.ts`
2. Add the new version to `package.json` exports and `typesVersions`; remove the oldest
3. Update `src/latest.d.ts` to re-export the new version
4. Update the publish workflow's type check list
5. Run `npm run update`
