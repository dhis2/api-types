/**
 * Type tests for DeriveResourceTypeMap and InferQueryResult — using v43 paths.
 *
 * v43 paths have the /api/ prefix: /api/dataElements/, /api/organisationUnits/, etc.
 * Tracker endpoints return opaque Page types and are excluded from the auto-derived
 * map — tracker resource queries resolve to `unknown` unless the map is supplemented.
 */

import type { paths, components } from "@dhis2/api-types/v43"
import type { DeriveResourceTypeMap, InferQueryResult } from "@dhis2/api-types/utils"

type V43Map = DeriveResourceTypeMap<paths>

// ── DeriveResourceTypeMap — metadata resources are present ────────────────────

// The map covers common metadata resources derived from the paths types
type DataElementItem = V43Map["dataElements"]
type OrgUnitItem = V43Map["organisationUnits"]

// Item types match the schema — valid assignments compile
const deItem: DataElementItem = {
    aggregationType: "SUM",
    domainType: "AGGREGATE",
    valueType: "INTEGER",
}

// @ts-expect-error — DataElement is not a plain string
const deItemBad: DataElementItem = "not-a-data-element"

// OrganisationUnit requires aggregationType and level
const ouItem: OrgUnitItem = { aggregationType: "SUM", level: 1 }

// ── InferQueryResult — no fields (full item type) ─────────────────────────────

const simpleQuery = {
    dataElements: { resource: "dataElements" },
} as const

type SimpleResult = InferQueryResult<typeof simpleQuery, V43Map>

// Valid: pager + resource array under the resource name key
const simpleResult: SimpleResult = {
    dataElements: {
        pager: { page: 1, pageCount: 10, total: 500, pageSize: 50 },
        dataElements: [{ aggregationType: "SUM", domainType: "AGGREGATE", valueType: "INTEGER" }],
    },
}

// pager is required in the nested response object
const simpleNoPager: SimpleResult = {
    // @ts-expect-error — pager is required
    dataElements: { dataElements: [] },
}

// ── InferQueryResult — with fields (narrowed via PickWithFieldFilters) ─────────

const fieldsQuery = {
    dataElements: {
        resource: "dataElements",
        params: { fields: ["id", "name", "valueType"] as const },
    },
} as const

type FieldsResult = InferQueryResult<typeof fieldsQuery, V43Map>

// Access the element type directly
type DERow = FieldsResult["dataElements"]["dataElements"][0]

// Fields in the filter are present and correctly typed
const validRow: DERow = { id: "fbfJHSPpUQD", name: "ANC 1st visit", valueType: "TEXT" }

// valueType preserves its enum type — not widened to string
const deValueType: DERow["valueType"] = "INTEGER"
// @ts-expect-error — enum constraints are preserved after filtering
const deValueTypeBad: DERow["valueType"] = "NOT_A_VALUE_TYPE"

// Full result shape
const fieldsResult: FieldsResult = {
    dataElements: {
        pager: { page: 1, pageCount: 1, total: 1, pageSize: 50 },
        dataElements: [{ id: "fbfJHSPpUQD", name: "ANC 1st visit", valueType: "TEXT" }],
    },
}

// ── InferQueryResult — multiple resources in one query ────────────────────────

const multiQuery = {
    dataElements: { resource: "dataElements" },
    orgUnits: { resource: "organisationUnits" },
} as const

type MultiResult = InferQueryResult<typeof multiQuery, V43Map>

const multiResult: MultiResult = {
    dataElements: {
        pager: { page: 1, pageCount: 1, total: 1, pageSize: 50 },
        dataElements: [{ aggregationType: "SUM", domainType: "AGGREGATE", valueType: "INTEGER" }],
    },
    orgUnits: {
        pager: { page: 1, pageCount: 1, total: 1, pageSize: 50 },
        organisationUnits: [{ aggregationType: "SUM", level: 1 }],
    },
}

// ── InferQueryResult — query key differs from resource array key ───────────────
// The response pager key is always the resource name, not the query key.

const renamedQuery = {
    myDEs: { resource: "dataElements" },
} as const

type RenamedResult = InferQueryResult<typeof renamedQuery, V43Map>

// Response uses "dataElements" as the array key even though the query key is "myDEs"
const renamedResult: RenamedResult = {
    myDEs: {
        pager: { page: 1, pageCount: 1, total: 1, pageSize: 50 },
        dataElements: [{ aggregationType: "SUM", domainType: "AGGREGATE", valueType: "INTEGER" }],
    },
}

// ── InferQueryResult — unknown resource → unknown ─────────────────────────────

const trackerQuery = {
    enrollments: { resource: "tracker/enrollments" },
} as const

type TrackerResult = InferQueryResult<typeof trackerQuery, V43Map>

// Tracker is not in the auto-derived map — resolves to unknown
const trackerAny: TrackerResult["enrollments"] = "anything"
const trackerObj: TrackerResult["enrollments"] = { arbitrary: true }

// ── Tracker supplement — extend the map with hand-written tracker types ────────

type TrackerMap = V43Map & {
    "tracker/enrollments": components["schemas"]["TrackerEnrollment"]
    "tracker/trackedEntities": components["schemas"]["TrackerTrackedEntity"]
}

const trackerEnrollmentsQuery = {
    enrollments: {
        resource: "tracker/enrollments",
        params: { fields: ["enrollment", "status"] as const },
    },
} as const

type TrackerEnrollmentsResult = InferQueryResult<typeof trackerEnrollmentsQuery, TrackerMap>
type EnrollmentRow = TrackerEnrollmentsResult["enrollments"]["enrollments"][0]

// With the supplemented map, tracker resources are fully typed
const validEnrollmentRow: EnrollmentRow = { enrollment: "mfCOxMNjPHO", status: "ACTIVE" }

// Enrollment status is preserved as the correct enum type after filtering
const enrollmentStatus: EnrollmentRow["status"] = "COMPLETED"
// @ts-expect-error — invalid status value
const enrollmentStatusBad: EnrollmentRow["status"] = "INVALID"
