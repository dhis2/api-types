/**
 * Type tests for DeriveResourceTypeMap and InferQueryResult — using v40 paths.
 *
 * v40 paths do NOT have the /api/ prefix: /dataElements/, /organisationUnits/, etc.
 * Confirms ExtractListResource handles this older path format.
 *
 * v40 uses legacy tracker (TrackedEntityInstance). Tracker endpoints have `unknown`
 * response bodies in the v40 spec — so tracker resources resolve to `unknown`
 * in the auto-derived map (same as all other versions, but for a different reason).
 */

import type { paths } from "@dhis2/api-types/v40"
import type { DeriveResourceTypeMap, InferQueryResult } from "@dhis2/api-types/utils"

type V40Map = DeriveResourceTypeMap<paths>

// ── DeriveResourceTypeMap — works with v40's /resource/ path format ───────────

type DataElementItem = V40Map["dataElements"]
type OrgUnitItem = V40Map["organisationUnits"]

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

type SimpleResult = InferQueryResult<typeof simpleQuery, V40Map>

const simpleResult: SimpleResult = {
    dataElements: {
        pager: { page: 1, pageCount: 3, total: 150, pageSize: 50 },
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
        params: { fields: ["id", "name", "valueType"] as const },
    },
} as const

type FieldsResult = InferQueryResult<typeof fieldsQuery, V40Map>
type DERow = FieldsResult["dataElements"]["dataElements"][0]

// Fields in the filter are present and correctly typed
const validRow: DERow = { id: "fbfJHSPpUQD", name: "ANC 1st visit", valueType: "TEXT" }

// valueType preserves its enum constraints through the inference chain
const deValueType: DERow["valueType"] = "INTEGER"
// @ts-expect-error — enum constraints are preserved after filtering
const deValueTypeBad: DERow["valueType"] = "NOT_A_TYPE"

// ── InferQueryResult — query key differs from resource key ────────────────────

const renamedQuery = {
    elements: { resource: "dataElements" },
} as const

type RenamedResult = InferQueryResult<typeof renamedQuery, V40Map>

// Response uses "dataElements" (resource name) as array key, not "elements" (query key)
const renamedResult: RenamedResult = {
    elements: {
        pager: { page: 1, pageCount: 1, total: 1, pageSize: 50 },
        dataElements: [{ aggregationType: "SUM", domainType: "AGGREGATE", valueType: "INTEGER" }],
    },
}

// ── InferQueryResult — tracker → unknown in v40 ───────────────────────────────

const trackerQuery = {
    trackedEntities: { resource: "tracker/trackedEntities" },
} as const

type TrackerResult = InferQueryResult<typeof trackerQuery, V40Map>

// v40 tracker spec types responses as `unknown` — not in auto-derived map
const trackerData: TrackerResult["trackedEntities"] = "anything"
