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

### Usage with `@dhis2/app-runtime`

Type the response of `useDataQuery` by building the result type from `PickWithFieldFilters` and `PagedResponse`, then passing it as the explicit generic. Declare fields `as const` — the same array drives both the TypeScript type and the `fields` query parameter, so they can never drift apart.

```ts
import { useDataQuery } from "@dhis2/app-runtime"
import type { DataElement } from "@dhis2/api-types"
import type { PickWithFieldFilters, PagedResponse } from "@dhis2/api-types/utils"

const DATA_ELEMENT_FIELDS = [
    "id",
    "name",
    "valueType",
    "categoryCombo[id,displayName]",
] as const

type DataElementRow = PickWithFieldFilters<DataElement, typeof DATA_ELEMENT_FIELDS>
// → {
//     id?: string
//     name?: string
//     valueType?: ValueType
//     categoryCombo?: { id?: string; displayName?: string }
//   }

type DataElementsQueryResult = {
    dataElements: PagedResponse<DataElementRow, "dataElements">
}

const query = {
    dataElements: {
        resource: "dataElements",
        params: { fields: DATA_ELEMENT_FIELDS.join(","), pageSize: 50 },
    },
}

function DataElementList() {
    const { data, loading, error } = useDataQuery<DataElementsQueryResult>(query)

    if (loading) return <span>Loading...</span>
    if (error) return <span>Error: {error.message}</span>

    return (
        <ul>
            {data?.dataElements.dataElements.map((de) => (
                <li key={de.id}>
                    {de.name} — {de.valueType} ({de.categoryCombo?.displayName})
                </li>
            ))}
        </ul>
    )
}
```

### Integrating `InferQueryResult` into `@dhis2/app-runtime`

> This section is for app-runtime maintainers. Once the integration is in place, consumers get accurate response types automatically with no explicit type annotations.

`InferQueryResult` and `DeriveResourceTypeMap` are designed to be used inside `useDataQuery`'s type signature, so that the hook infers its return type from the query object itself. The query must be passed `as const` for field narrowing to work (fields must be literal string arrays, not `string[]`).

**Proposed `useDataQuery` signature:**

```ts
import type { paths as LatestPaths } from "@dhis2/api-types"
import type { DeriveResourceTypeMap, InferQueryResult } from "@dhis2/api-types/utils"

// Pre-compute the default map at module level — derived once, not per-call
type DefaultMap = DeriveResourceTypeMap<LatestPaths>

declare function useDataQuery<
    Q extends Record<string, { resource: string }>,
    TResult = InferQueryResult<Q, DefaultMap>
>(query: Q, options?: UseDataQueryOptions): UseDataQueryResult<TResult>
```

**Consumer experience after the integration — no explicit types needed:**

```ts
const { data } = useDataQuery({
    dataElements: {
        resource: "dataElements",
        params: { fields: ["id", "name", "valueType"] as const },
    },
} as const)

// data is fully typed automatically:
// data.dataElements.pager       → Pager
// data.dataElements.dataElements[0].valueType  → ValueType (enum)
```

**Targeting a specific DHIS2 API version:**

Consumers running against an older DHIS2 instance can pass an explicit `TResult` built from the right version's paths:

```ts
import type { paths } from "@dhis2/api-types/v42"
import type { DeriveResourceTypeMap, InferQueryResult } from "@dhis2/api-types/utils"

const query = {
    dataElements: {
        resource: "dataElements",
        params: { fields: ["id", "name"] as const },
    },
} as const

type Result = InferQueryResult<typeof query, DeriveResourceTypeMap<paths>>
const { data } = useDataQuery<typeof query, Result>(query)
```

**Overriding the inferred type (escape hatch):**

Pass an explicit `TResult` to opt out of inference entirely — useful for resources not in the auto-derived map, or when the inferred type needs to be widened:

```ts
type MyResult = {
    dataElements: {
        pager: { page: number; pageCount: number; total: number; pageSize: number }
        dataElements: MyCustomDataElement[]
    }
}
const { data } = useDataQuery<typeof query, MyResult>(query)
```

**Tracker resources:**

Tracker endpoints return opaque types in the spec and are not included in the default map — queries for tracker resources resolve to `unknown`. To type them, extend the map:

```ts
import type { paths, TrackerEnrollment } from "@dhis2/api-types"
import type { DeriveResourceTypeMap, InferQueryResult } from "@dhis2/api-types/utils"

type TrackerMap = DeriveResourceTypeMap<paths> & {
    "tracker/enrollments": TrackerEnrollment
}

// App-runtime could expose TrackerMap (or accept a custom map) for tracker queries
type Result = InferQueryResult<typeof query, TrackerMap>
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

### `DeriveResourceTypeMap<P>`

Auto-derives a resource-name → item-type map from an OpenAPI `paths` type. Used internally by `@dhis2/app-runtime` to power `useDataQuery`'s return type inference. Inspects every `GET /resource/` and `GET /api/resource/` endpoint and maps the resource name to the item element type in its paginated response body.

Tracker endpoints return opaque types in the spec and are excluded — their item type cannot be derived automatically. See the [app-runtime integration section](#integrating-inferqueryresult-into-dhis2app-runtime) for how to supplement the map with tracker types.

### `InferQueryResult<Q, Map>`

Infers the full `PagedResponse`-shaped result type for an app-runtime query object given a resource map. Used internally by `@dhis2/app-runtime`; see the [app-runtime integration section](#integrating-inferqueryresult-into-dhis2app-runtime) for usage patterns including version targeting and type overrides.

For field narrowing to work, `fields` must be a `readonly string[]` literal (`as const`) — `.join(",")` erases the literal type and disables narrowing.

### `PagedResponse<T, Key>`

Types a paginated DHIS2 list endpoint response. All list endpoints return a `pager` object alongside the resource array, keyed by the resource name.

```ts
import type { DataElement } from "@dhis2/api-types"
import type { PagedResponse } from "@dhis2/api-types/utils"

type DataElementsPage = PagedResponse<DataElement, "dataElements">
// → {
//     pager: { page: number; pageCount: number; total: number; pageSize: number; prevPage?: string; nextPage?: string }
//     dataElements: DataElement[]
//   }
```

Combine with `PickWithFieldFilters` to narrow items to exactly the requested fields (see the `@dhis2/app-runtime` example above).

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

### Publishing

The publish workflow runs on two triggers, intentionally different:

**Stable releases — tag-based, manual.**
Pushing a `v*` tag from any branch publishes to the `latest` dist-tag on npm. The version in `package.json` is used as-is. This requires a deliberate action, which is the point — stable releases affect everyone who runs `npm install @dhis2/api-types` and should never happen by accident.

```sh
# Bump the version, commit, then tag and push
npm version patch          # or minor / major
git push && git push --tags
```

**Prerelease channels — branch-based, automatic.**
Any push to the `beta` or `alpha` branches immediately publishes to the matching dist-tag on npm. The version is auto-generated as `{base}-{channel}.{short-sha}` (e.g. `43.0.0-beta.abc1f3a`) so every commit produces a unique, traceable package version without any manual version management.

```sh
# Make changes on the beta branch — publishing is automatic on push
git checkout beta
git merge my-feature-branch
git push
# → publishes 43.0.0-beta.abc1f3a to npm@beta
```

Consumers opt into a channel explicitly:

```sh
npm install @dhis2/api-types          # stable, unaffected by prerelease activity
npm install @dhis2/api-types@beta     # latest beta build
npm install @dhis2/api-types@alpha    # latest alpha build
```

**Why this split is a good compromise.**
Stable releases carry real weight — a bad publish to `latest` breaks every downstream project that runs `npm install`. Tag-based publishing forces a deliberate decision: someone has to run `git tag`, review what they're shipping, and push the tag intentionally. That friction is a feature, not a bug.

Prerelease channels are the opposite: speed and low ceremony matter more than caution. A branch-based trigger means merging a PR to `beta` is all it takes to make types available for integration testing — no context-switching to create a tag, no deciding on a prerelease version number. The SHA-stamped version also means you can always trace a `@beta` install back to the exact commit it came from.

The result: `latest` stays stable and trustworthy, while `beta` and `alpha` move fast and stay current with in-progress work.

### Releasing a new stable version

1. Run `npm run update` and review the diff in `specs/` and `src/`
2. Bump the version in `package.json` (`npm version patch|minor|major`)
3. Commit, push, then tag:

```sh
git push && git push --tags
```

The regenerate workflow also runs monthly on a schedule and opens a PR automatically
if any specs have changed.

### Adding a new DHIS2 API version

1. Add an entry to `scripts/versions.ts`
2. Add the new version to `package.json` exports and `typesVersions`; remove the oldest
3. Update `src/latest.d.ts` to re-export the new version
4. Update the publish workflow's type check list
5. Run `npm run update`
