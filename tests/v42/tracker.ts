/**
 * Type tests for tracker models in v42.
 *
 * v42 uses the modern tracker API (TrackerTrackedEntity, TrackerEnrollment)
 * but does NOT include the `Event` schema — it was removed in this version
 * and restored in v43. Use the operations types for event-level typing in v42.
 *
 * Key differences from v41:
 *   - Legacy Enrollment type removed
 *   - Event schema absent (use operations["TrackerEventsExport.getEvents..."] instead)
 *   - EnrollmentStatus and EventStatus are now standalone schemas
 *   - TrackedEntityAttribute: only aggregationType + valueType still required (not minCharactersToSearch)
 */

import type {
    TrackerTrackedEntity,
    TrackerEnrollment,
    EnrollmentStatus,
    TrackedEntityType,
    TrackedEntityAttribute,
    TrackerRelationship,
} from "@dhis2/api-types/v42"

// ── TrackerTrackedEntity ──────────────────────────────────────────────────────

const te: TrackerTrackedEntity = {}

const teWithData: TrackerTrackedEntity = {
    trackedEntity: "HNTA2BKtnNB",
    trackedEntityType: "nEenWmSyUEp",
    orgUnit: "DiszpKrYNg8",
    inactive: false,
    potentialDuplicate: false,
}

// @ts-expect-error — inactive must be boolean
const teBadInactive: TrackerTrackedEntity = { inactive: "false" }

// ── TrackerEnrollment ─────────────────────────────────────────────────────────

// @ts-expect-error — status is required
const enrollmentNoStatus: TrackerEnrollment = { program: "IpHINAT79UW" }

const enrollment: TrackerEnrollment = {
    status: "ACTIVE",
    program: "IpHINAT79UW",
    trackedEntity: "HNTA2BKtnNB",
    orgUnit: "DiszpKrYNg8",
}

// @ts-expect-error — EXPIRED is not a valid EnrollmentStatus
const enrollmentBadStatus: TrackerEnrollment = { status: "EXPIRED" }

// EnrollmentStatus is a standalone schema in v42 (unlike v40/v41)
const es: EnrollmentStatus = "CANCELLED"
// @ts-expect-error
const esBad: EnrollmentStatus = "INACTIVE"

// ── TrackedEntityType ─────────────────────────────────────────────────────────

const tet: TrackedEntityType = {
    featureType: "NONE",
    maxTeiCountToReturn: 0,
    minAttributesRequiredToSearch: 1,
}

// @ts-expect-error — featureType is required
const tetMissing: TrackedEntityType = {
    maxTeiCountToReturn: 0,
    minAttributesRequiredToSearch: 1,
}

// ── TrackedEntityAttribute ────────────────────────────────────────────────────
// In v42, only aggregationType + valueType required (same as v40/v41).
// minCharactersToSearch and preferredSearchOperator are not yet required.

const tea: TrackedEntityAttribute = {
    aggregationType: "NONE",
    valueType: "TEXT",
}

// @ts-expect-error — aggregationType is required
const teaMissing: TrackedEntityAttribute = { valueType: "TEXT" }

// ── TrackerRelationship ───────────────────────────────────────────────────────

const rel: TrackerRelationship = {}
const relWithData: TrackerRelationship = {
    relationship: "mfCOxMNjPHO",
    relationshipType: "TV9oB9LT3sh",
}
