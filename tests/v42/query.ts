/**
 * Type tests for DeriveResourceTypeMap and InferQueryResult — using v42 paths.
 *
 * v42 paths have the /api/ prefix (same as v43).
 * Confirms the derived map matches v42-specific schema types.
 */

import type { paths, components } from "@dhis2/api-types/v42"
import type { DeriveResourceTypeMap, InferQueryResult } from "@dhis2/api-types/utils"

type V42Map = DeriveResourceTypeMap<paths>

// ── DeriveResourceTypeMap ─────────────────────────────────────────────────────

type DataElementItem = V42Map["dataElements"]
type OrgUnitItem = V42Map["organisationUnits"]

const deItem: DataElementItem = {
    aggregationType: "SUM",
    domainType: "AGGREGATE",
    valueType: "INTEGER",
}

// @ts-expect-error — DataElement is not a string
const deItemBad: DataElementItem = "not-an-object"

const ouItem: OrgUnitItem = { aggregationType: "SUM", level: 1 }

// ── InferQueryResult — no fields ──────────────────────────────────────────────

const simpleQuery = {
    dataElements: { resource: "dataElements" },
} as const

type SimpleResult = InferQueryResult<typeof simpleQuery, V42Map>

const simpleResult: SimpleResult = {
    dataElements: {
        pager: { page: 1, pageCount: 5, total: 250, pageSize: 50 },
        dataElements: [{ aggregationType: "NONE", domainType: "AGGREGATE", valueType: "TEXT" }],
    },
}

// pager is required in the nested response object
const simpleNoPager: SimpleResult = {
    // @ts-expect-error — pager is required
    dataElements: { dataElements: [] },
}

// ── InferQueryResult — with fields ────────────────────────────────────────────

const fieldsQuery = {
    dataElements: {
        resource: "dataElements",
        params: { fields: ["id", "name"] as const },
    },
} as const

type FieldsResult = InferQueryResult<typeof fieldsQuery, V42Map>
type DERow = FieldsResult["dataElements"]["dataElements"][0]

// Fields in the filter are present and correctly typed
const validRow: DERow = { id: "fbfJHSPpUQD", name: "ANC 1st visit" }

// id and name are optional in the result (all filtered fields are optional)
const validRowOptional: DERow = {}
const validRowPartial: DERow = { id: "fbfJHSPpUQD" }

// ── InferQueryResult — tracker not in auto-derived map ───────────────────────

const trackerQuery = {
    trackedEntities: { resource: "tracker/trackedEntities" },
} as const

type TrackerResult = InferQueryResult<typeof trackerQuery, V42Map>

// Resolves to unknown — spec types tracker responses opaquely in v42
const trackerData: TrackerResult["trackedEntities"] = 42
const trackerObj: TrackerResult["trackedEntities"] = { anything: true }

// ── Tracker supplement ────────────────────────────────────────────────────────

type TrackerMap = V42Map & {
    "tracker/trackedEntities": components["schemas"]["TrackerTrackedEntity"]
    "tracker/enrollments": components["schemas"]["TrackerEnrollment"]
}

const trackerTEQuery = {
    trackedEntities: {
        resource: "tracker/trackedEntities",
        params: { fields: ["trackedEntity", "orgUnit"] as const },
    },
} as const

type TrackerTEResult = InferQueryResult<typeof trackerTEQuery, TrackerMap>
type TERow = TrackerTEResult["trackedEntities"]["trackedEntities"][0]

// Fields in the filter are present and correctly typed
const validTERow: TERow = { trackedEntity: "HNTA2BKtnNB", orgUnit: "DiszpKrYNg8" }

// Filtering preserves field optionality — only the requested fields exist on the row type
const validTERowPartial: TERow = { trackedEntity: "HNTA2BKtnNB" }
