/**
 * Type tests verifying GistModel and PickWithFieldFilters work with v40 types.
 *
 * v40 uses different schema names for tracker (TrackedEntityInstance instead
 * of TrackerTrackedEntity), but the utilities are version-agnostic generics
 * and must compile correctly against any version's component schemas.
 */

import type { components } from "@dhis2/api-types/v40"
import type { GistModel, PickWithFieldFilters, PagedResponse } from "@dhis2/api-types/utils"

type DataElement = components["schemas"]["DataElement"]
type TrackedEntityInstance = components["schemas"]["TrackedEntityInstance"]

// ── GistModel with v40 types ──────────────────────────────────────────────────

type DEGist = GistModel<DataElement>

// Arrays → number
const gistArrayField: DEGist["aggregationLevels"] = 7
// @ts-expect-error
const gistArrayFieldBad: DEGist["aggregationLevels"] = []

// Object reference → string
const gistRef: DEGist["categoryCombo"] = "bjDvmb4bfuf"
// @ts-expect-error
const gistRefBad: DEGist["categoryCombo"] = { id: "bjD" }

// Enum types preserved — not collapsed to bare string
const gistEnum: DEGist["aggregationType"] = "SUM"
// @ts-expect-error
const gistEnumBad: DEGist["aggregationType"] = "INVALID"

// GistModel on v40's tracker type (TrackedEntityInstance)
type TEIGist = GistModel<TrackedEntityInstance>

// programInstances is an array → count
const gistPrograms: TEIGist["programInstances"] = 2
// @ts-expect-error
const gistProgramsBad: TEIGist["programInstances"] = []

// id is a string scalar → unchanged
const gistId: TEIGist["id"] = "HNTA2BKtnNB"
// @ts-expect-error
const gistIdBad: TEIGist["id"] = 42

// ── PickWithFieldFilters with v40 types ───────────────────────────────────────

// valueType is required in v40 DataElement, same as v43
type DEFlat = PickWithFieldFilters<DataElement, ["id", "name", "valueType"]>

const flat: DEFlat = { id: "abc", name: "ANC 1st visit", valueType: "INTEGER" }

// Optional fields (id, name) can be omitted; required valueType cannot
const flatOptionalOmitted: DEFlat = { valueType: "TEXT" }

const flatBad: DEFlat = {
    id: "abc",
    valueType: "INTEGER",
    // @ts-expect-error — domainType not in the filter
    domainType: "AGGREGATE",
}

// Nested pick — in v40, DataElement.categoryCombo is { id: string } (only id),
// unlike v43 where it is IdentifiableObject (id, name, code, etc.)
type DEWithCombo = PickWithFieldFilters<DataElement, ["id", "categoryCombo[id]"]>

const withCombo: DEWithCombo = {
    id: "fbfJHSPpUQD",
    categoryCombo: { id: "bjDvmb4bfuf" },
}

// Nested fields are optional
const withComboAbsent: DEWithCombo = { id: "fbfJHSPpUQD" }

const withComboBad: DEWithCombo = {
    categoryCombo: {
        id: "bjD",
        // @ts-expect-error — name not available on v40's { id: string } categoryCombo type
        name: "default",
    },
}

// ── PagedResponse with v40 types ───────────────────────────────────────────────
// PagedResponse is version-agnostic — it works the same against v40 schemas.

type DataElementsPage = PagedResponse<DataElement, "dataElements">

const page: DataElementsPage = {
    pager: { page: 1, pageCount: 4, total: 200, pageSize: 50 },
    dataElements: [{ aggregationType: "SUM", domainType: "AGGREGATE", valueType: "INTEGER" }],
}

// prevPage / nextPage are optional on pager
const pageWithPrev: DataElementsPage = {
    pager: { page: 2, pageCount: 4, total: 200, pageSize: 50, prevPage: "/api/dataElements?page=1" },
    dataElements: [],
}

// @ts-expect-error — pager is required
const pageNoPager: DataElementsPage = { dataElements: [] }

// PagedResponse on v40's legacy tracker type
type TrackedEntityInstancesPage = PagedResponse<TrackedEntityInstance, "trackedEntityInstances">

const teiPage: TrackedEntityInstancesPage = {
    pager: { page: 1, pageCount: 1, total: 3, pageSize: 50 },
    trackedEntityInstances: [{ id: "HNTA2BKtnNB" }],
}
