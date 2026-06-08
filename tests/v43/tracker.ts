/**
 * Type tests for tracker models in v43.
 *
 * v43 uses the modern tracker API (/api/tracker/*):
 *   TrackerTrackedEntity, TrackerEnrollment, Event
 * plus supporting types: TrackedEntityType, TrackedEntityAttribute, TrackerRelationship.
 *
 * TrackerTrackedEntity has no required fields. TrackerEnrollment and Event both
 * require `status`.
 */

import type {
    TrackerTrackedEntity,
    TrackerEnrollment,
    Event,
    EnrollmentStatus,
    EventStatus,
    TrackedEntityType,
    TrackedEntityAttribute,
    TrackerRelationship,
    ValueType,
} from "@dhis2/api-types/v43"

// ── TrackerTrackedEntity ──────────────────────────────────────────────────────

// No required fields — a minimal tracked entity response is valid
const emptyTE: TrackerTrackedEntity = {}

const trackedEntity: TrackerTrackedEntity = {
    trackedEntity: "HNTA2BKtnNB",
    trackedEntityType: "nEenWmSyUEp",
    orgUnit: "DiszpKrYNg8",
    inactive: false,
    potentialDuplicate: false,
    storedBy: "admin",
}

// @ts-expect-error — inactive must be boolean, not string
const badInactive: TrackerTrackedEntity = { inactive: "no" }

// @ts-expect-error — trackedEntity (UID) must be a string, not a number
const badUid: TrackerTrackedEntity = { trackedEntity: 12345 }

// ── TrackerEnrollment ─────────────────────────────────────────────────────────

// @ts-expect-error — status is required
const enrollmentMissingStatus: TrackerEnrollment = { program: "IpHINAT79UW" }

const enrollment: TrackerEnrollment = {
    status: "ACTIVE",
    program: "IpHINAT79UW",
    trackedEntity: "HNTA2BKtnNB",
    orgUnit: "DiszpKrYNg8",
    enrolledAt: "2024-01-15T08:00:00.000Z",
}

// @ts-expect-error — PENDING is not a valid EnrollmentStatus (only ACTIVE | COMPLETED | CANCELLED)
const badEnrollmentStatus: TrackerEnrollment = { status: "PENDING" }

// ── Event ─────────────────────────────────────────────────────────────────────

// @ts-expect-error — status is required
const eventMissingStatus: Event = { program: "IpHINAT79UW" }

const event: Event = {
    status: "SCHEDULE",
    program: "IpHINAT79UW",
    programStage: "A03MvHHogjR",
    orgUnit: "DiszpKrYNg8",
    occurredAt: "2024-01-15T08:00:00.000Z",
    trackedEntity: "HNTA2BKtnNB",
    enrollment: "mfCOxMNjPHO",
}

// @ts-expect-error — INVALID is not a valid EventStatus
const badEventStatus: Event = { status: "INVALID" }

// Valid EventStatus values: ACTIVE | COMPLETED | VISITED | SCHEDULE | OVERDUE | SKIPPED
const scheduleEvent: Event = { status: "SCHEDULE" }
const overdueEvent: Event = { status: "OVERDUE" }

// ── Enum types are independently usable ──────────────────────────────────────

const enrollmentStatus: EnrollmentStatus = "COMPLETED"
const eventStatus: EventStatus = "SKIPPED"

// @ts-expect-error
const badEs: EnrollmentStatus = "UNKNOWN"

// @ts-expect-error
const badEvs: EventStatus = "PENDING"

// ── TrackedEntityType ─────────────────────────────────────────────────────────
// Required: featureType, maxTeiCountToReturn, minAttributesRequiredToSearch

const tet: TrackedEntityType = {
    featureType: "POINT",
    maxTeiCountToReturn: 0,
    minAttributesRequiredToSearch: 1,
    id: "nEenWmSyUEp",
    name: "Person",
}

// @ts-expect-error — featureType is required
const tetMissing: TrackedEntityType = {
    maxTeiCountToReturn: 0,
    minAttributesRequiredToSearch: 1,
}

const tetBadFeature: TrackedEntityType = {
    // @ts-expect-error — not a valid FeatureType
    featureType: "LINE",
    maxTeiCountToReturn: 0,
    minAttributesRequiredToSearch: 1,
}

// ── TrackedEntityAttribute ────────────────────────────────────────────────────
// Required: aggregationType, minCharactersToSearch, preferredSearchOperator, valueType

const tea: TrackedEntityAttribute = {
    aggregationType: "NONE",
    minCharactersToSearch: 2,
    preferredSearchOperator: "LIKE",
    valueType: "TEXT",
    id: "w75KJ2mc4zz",
    name: "First name",
}

// @ts-expect-error — valueType is required
const teaMissing: TrackedEntityAttribute = {
    aggregationType: "NONE",
    minCharactersToSearch: 2,
    preferredSearchOperator: "LIKE",
}

// valueType is the shared ValueType enum
const teaValueType: ValueType = "DATE"
// @ts-expect-error
const teaValueTypeBad: ValueType = "DECIMAL"

// ── TrackerRelationship ───────────────────────────────────────────────────────
// No required fields — relationships are fetched as part of entity responses

const rel: TrackerRelationship = {}

const relFull: TrackerRelationship = {
    relationship: "mfCOxMNjPHO",
    relationshipType: "TV9oB9LT3sh",
    from: { trackedEntity: { trackedEntity: "HNTA2BKtnNB" } },
    to: { trackedEntity: { trackedEntity: "abc123" } },
}

// @ts-expect-error — relationship UID must be string
const relBadUid: TrackerRelationship = { relationship: 999 }
