# Overriding and patching OpenAPI spec errors

## Status

Accepted

## Context and Problem Statement

The DHIS2 OpenAPI specification is machine-generated from the Java backend. It occasionally contains errors: fields typed incorrectly, required flags missing or wrong, broken `$ref` references, or missing fields entirely. Because `@dhis2/api-types` generates its types directly from the spec, these errors propagate into the published types unchanged.

There are two audiences affected: the library itself (which can correct errors before publishing) and consumers (who need a workaround while waiting for a fix upstream or in the library).

## Decision Drivers

- Corrections should be traceable — it must be clear what was changed, why, and what upstream issue it relates to
- Corrections should be temporary by default — they should be easy to remove once the spec is fixed
- The generate pipeline must remain deterministic: the same spec always produces the same output, with patches applied in a predictable order
- Consumer workarounds must not require modifying library files

## Library-side overrides

The library has two tools for correcting spec errors before types are generated.

### Spec patching (primary approach)

The simplest and most readable correction is to modify the parsed spec object in `generate.ts` before passing it to `openapi-typescript`. The spec is a plain JavaScript object after `JSON.parse`, so any field can be corrected programmatically.

```ts
// scripts/generate.ts — applied after JSON.parse(specRaw), before openapiTS(spec)

// Fix: Pager.total is typed as string in the spec but is always an integer.
// Upstream issue: https://dhis2.atlassian.net/browse/DHIS2-XXXXX
spec.components.schemas.Pager.properties.total.type = "integer"

// Fix: TrackerEnrollment is missing 'trackedEntity' from its required list.
spec.components.schemas.TrackerEnrollment.required = [
    ...(spec.components.schemas.TrackerEnrollment.required ?? []),
    "trackedEntity",
]

// Fix: DataElement.aggregationLevels items were wrongly typed as string.
spec.components.schemas.DataElement.properties.aggregationLevels.items = { type: "number" }
```

Each patch must include a comment linking to the upstream DHIS2 issue. When the spec is fixed and the fix is confirmed by running `npm run fetch-specs --force` and seeing the correct output, the patch is removed.

This library already uses this approach to fix broken `$ref` names in the v42 spec (`GetObjectListParams.filters` → `GetObjectListParams.filter`). That fix uses string replacement on the raw JSON rather than the parsed object because it targets `$ref` strings that affect reference resolution before parsing. Both techniques are valid; parsed-object patching is preferred for everything else.

### `transform` hook (for structural changes)

`openapi-typescript` v7 exposes a `transform` option that intercepts individual schema objects during generation and returns a replacement TypeScript AST node. This is the right tool when the correction is about *how a schema is represented* rather than *what its fields contain* — for example, mapping all `date-time` format strings to `Date` objects instead of `string`.

```ts
import ts from "typescript"

const ast = await openapiTS(spec, {
    transform(schemaObject, { path }) {
        if (schemaObject.type === "string" && schemaObject.format === "date-time") {
            return ts.factory.createTypeReferenceNode("Date")
        }
    },
})
```

This is significantly more complex than spec patching (it requires working with the TypeScript compiler API) and should only be used when the correction cannot be expressed as a change to the spec JSON.

## Consumer-side overrides

Consumers cannot modify the library's `.d.ts` files — they are overwritten on every install. Two patterns are available.

### Local type alias with `Omit` and intersection (recommended)

The standard approach is to derive a corrected type locally using `Omit` to remove the wrong field and an intersection to replace it with the right one:

```ts
import type { DataElement } from "@dhis2/api-types/v43"

// Spec incorrectly types `someField` as string; it is actually a number.
// Remove this alias once @dhis2/api-types >= X.Y.Z is released.
type FixedDataElement = Omit<DataElement, "someField"> & { someField: number }
```

For a response envelope:

```ts
import type { components } from "@dhis2/api-types/v43"

type RawPager = components["schemas"]["Pager"]

// Spec has total as string but the API always returns a number.
type Pager = Omit<RawPager, "total"> & { total: number }
```

The comment indicating the fix version is important — without it, the workaround will silently remain in the codebase long after the library is updated.

### Module augmentation (for adding missing fields only)

Because `openapi-typescript` generates `components` as a TypeScript `interface` (not a `type` alias), TypeScript's declaration merging allows consumers to extend it with additional members:

```ts
// types/dhis2-overrides.d.ts
declare module "@dhis2/api-types/v43" {
    interface components {
        schemas: {
            DataElement: {
                // Field present in the API response but missing from the spec
                missingField?: string
            }
        }
    }
}
```

**This approach only works for adding fields.** TypeScript's declaration merging does not allow redefining a property that already exists in the interface — attempting to change the type of an existing field produces a type conflict error. For correcting wrong types on existing fields, the `Omit` + intersection alias is the only option.

## Publishing process for a spec error

### When the DHIS2 spec is wrong (upstream bug)

The correct long-term resolution is a fix in the DHIS2 backend, which regenerates the spec. In the meantime:

1. **Apply a spec patch in `generate.ts`** to produce the correct type immediately
2. **Regenerate** with `npm run generate`
3. **Publish a patch version**:
   ```sh
   npm version patch
   git push && git push --tags
   ```
4. **Document the patch** in `generate.ts` with a comment linking to the upstream DHIS2 issue tracker entry
5. **When DHIS2 ships the fix**, confirm the new spec is correct (`npm run fetch-specs --force`), remove the patch from `generate.ts`, regenerate, and publish another patch

### When the library's processing is wrong

If the error is in `generate.ts` itself — incorrect patching logic, a broken transform, or an alias generation bug — fix it, regenerate, and publish a patch.

### Versioning of corrections

A type correction is technically a breaking change: any consumer code that happened to depend on the wrong type will now fail. In practice, incorrect types were never a supported contract, and corrections are versioned as **patches**. The release notes must clearly describe what changed so consumers know to remove any local workarounds they applied.

Corrections that change a type in a way that is additive (e.g. adding a missing optional field) are unambiguously non-breaking and can always be patches. Corrections that narrow a type (e.g. changing `string` to `"ACTIVE" | "COMPLETED"`) may break code that assigned arbitrary strings, and should be called out explicitly in the changelog even when versioned as a patch.
