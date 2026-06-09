/**
 * Type tests for DeriveResourceTypeMap and InferQueryResult — using v41 paths.
 *
 * v41 paths do NOT have the /api/ prefix: /dataElements/, /organisationUnits/, etc.
 * Verifies that ExtractListResource handles this older path format correctly.
 *
 * v41 is the first version with TrackerTrackedEntity alongside the legacy
 * TrackedEntityInstance schema.
 */

import type { paths, components } from "@dhis2/api-types/v41"
import type { DeriveResourceTypeMap, InferQueryResult } from "@dhis2/api-types/utils"

type V41Map = DeriveResourceTypeMap<paths>

// ── DeriveResourceTypeMap — works with v41's /resource/ path format ───────────

type DataElementItem = V41Map["dataElements"]
type OrgUnitItem = V41Map["organisationUnits"]

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

type SimpleResult = InferQueryResult<typeof simpleQuery, V41Map>

const simpleResult: SimpleResult = {
    dataElements: {
        pager: { page: 1, pageCount: 2, total: 100, pageSize: 50 },
        dataElements: [{ aggregationType: "SUM", domainType: "AGGREGATE", valueType: "INTEGER" }],
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

type FieldsResult = InferQueryResult<typeof fieldsQuery, V41Map>
type DERow = FieldsResult["dataElements"]["dataElements"][0]

// Fields in the filter are present and correctly typed
const validRow: DERow = { id: "fbfJHSPpUQD", name: "ANC 1st visit", valueType: "TEXT" }

// valueType preserves its enum constraints
const deValueType: DERow["valueType"] = "BOOLEAN"
// @ts-expect-error — enum constraints are preserved after filtering
const deValueTypeBad: DERow["valueType"] = "NOT_A_TYPE"

// ── InferQueryResult — multiple resources ─────────────────────────────────────

const multiQuery = {
    dataElements: { resource: "dataElements" },
    indicators: { resource: "indicators" },
} as const

type MultiResult = InferQueryResult<typeof multiQuery, V41Map>

// v41 Indicator only requires aggregationType
const multiResult: MultiResult = {
    dataElements: {
        pager: { page: 1, pageCount: 1, total: 1, pageSize: 50 },
        dataElements: [{ aggregationType: "SUM", domainType: "AGGREGATE", valueType: "INTEGER" }],
    },
    indicators: {
        pager: { page: 1, pageCount: 1, total: 1, pageSize: 50 },
        indicators: [{ aggregationType: "COUNT" }],
    },
}

// ── Tracker supplement — v41 introduces TrackerTrackedEntity ──────────────────

type TrackerMap = V41Map & {
    "tracker/trackedEntities": components["schemas"]["TrackerTrackedEntity"]
    "tracker/enrollments": components["schemas"]["TrackerEnrollment"]
}

const trackerQuery = {
    trackedEntities: {
        resource: "tracker/trackedEntities",
        params: { fields: ["trackedEntity", "trackedEntityType"] as const },
    },
} as const

type TrackerResult = InferQueryResult<typeof trackerQuery, TrackerMap>
type TERow = TrackerResult["trackedEntities"]["trackedEntities"][0]

// Fields in the filter are present and correctly typed
const validTERow: TERow = { trackedEntity: "HNTA2BKtnNB", trackedEntityType: "nEenWmSyUEp" }

// Filtering preserves field optionality
const validTERowPartial: TERow = { trackedEntity: "HNTA2BKtnNB" }
