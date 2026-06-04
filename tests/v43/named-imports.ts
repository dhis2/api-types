/**
 * Type tests for named schema imports.
 *
 * Every schema in the OpenAPI spec is exported as a named alias from the
 * version entry point. This means consumers can import types directly
 * instead of going through components["schemas"].
 */

import type {
    DataElement,
    DataElementGroup,
    Event,
    Program,
    OrganisationUnit,
    TrackerTrackedEntity,
    TrackerEnrollment,
    CategoryCombo,
    DataSet,
    User,
    ValueType,
    AggregationType,
    EnrollmentStatus,
    EventStatus,
    UID_DataElement,
} from "@dhis2/api-types/v43"

// ── Named imports are identical to components["schemas"] aliases ──────────────

// DataElement: same required fields, same enum constraints
const de: DataElement = {
    aggregationType: "SUM",
    domainType: "AGGREGATE",
    valueType: "INTEGER",
    id: "fbfJHSPpUQD",
    name: "ANC 1st visit",
}

const deBadEnum: DataElement = {
    aggregationType: "SUM",
    domainType: "AGGREGATE",
    // @ts-expect-error — named import preserves enum constraints
    valueType: "INVALID",
}

// Standalone enum types work as type constraints
const vt: ValueType = "BOOLEAN"
const agg: AggregationType = "AVERAGE_SUM_ORG_UNIT"

// @ts-expect-error
const vtBad: ValueType = "NOPE"

// ── Tracker types ─────────────────────────────────────────────────────────────

// TrackerTrackedEntity: no required fields
const te: TrackerTrackedEntity = {}
const teWithFields: TrackerTrackedEntity = {
    trackedEntity: "HNTA2BKtnNB",
    orgUnit: "DiszpKrYNg8",
    inactive: false,
}

// TrackerEnrollment: status is required
// @ts-expect-error — status is required
const enrollmentNoStatus: TrackerEnrollment = { program: "IpHINAT79UW" }

const enrollment: TrackerEnrollment = { status: "ACTIVE", program: "IpHINAT79UW" }

// @ts-expect-error
const enrollmentBadStatus: TrackerEnrollment = { status: "PENDING" }

// Event: status is required
const event: Event = { status: "SCHEDULE", orgUnit: "DiszpKrYNg8" }
const eventStatus: EventStatus = "OVERDUE"

// ── Metadata types ────────────────────────────────────────────────────────────

// Use declare to verify the type name resolves — assignment would require
// all required fields, which is covered by the data-element.ts tests
declare const program: Program
declare const orgUnit: OrganisationUnit
declare const catCombo: CategoryCombo
declare const dataSet: DataSet
declare const user: User
declare const deGroup: DataElementGroup

// ── UID types — typed string aliases for UIDs of specific resources ────────────

const deUid: UID_DataElement = "fbfJHSPpUQD"
// @ts-expect-error — UID type is a string alias; number is not valid
const deUidBad: UID_DataElement = 12345

// EnrollmentStatus enum works standalone
const es: EnrollmentStatus = "COMPLETED"
// @ts-expect-error
const esBad: EnrollmentStatus = "UNKNOWN"
