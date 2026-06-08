/**
 * Type tests for tracker models in v41.
 *
 * v41 introduces the modern tracker API (TrackerTrackedEntity, TrackerEnrollment,
 * Event) alongside the legacy Enrollment type. Both coexist in this version.
 *
 * Key differences from v40:
 *   - TrackerTrackedEntity replaces TrackedEntityInstance (no required fields)
 *   - TrackerEnrollment (status only required) vs legacy Enrollment (status only too, but
 *     reference fields are now { id: string } objects, not plain strings)
 *   - Event is present for the first time (removed in v42, restored in v43)
 *
 * Key differences from v42+:
 *   - Legacy Enrollment type still present alongside TrackerEnrollment
 *   - EnrollmentStatus and EventStatus are not standalone schemas (inline enums only)
 *   - TrackedEntityAttribute only requires aggregationType + valueType
 */

import type {
    TrackerTrackedEntity,
    TrackerEnrollment,
    Enrollment,
    Event,
    TrackedEntityType,
    TrackedEntityAttribute,
} from "@dhis2/api-types/v41"

// ── TrackerTrackedEntity (modern API, new in v41) ─────────────────────────────
// No required fields

const te: TrackerTrackedEntity = {}

const teWithData: TrackerTrackedEntity = {
    trackedEntity: "HNTA2BKtnNB",
    trackedEntityType: "nEenWmSyUEp",
    orgUnit: "DiszpKrYNg8",
    inactive: false,
}

// @ts-expect-error — inactive must be boolean
const teBadType: TrackerTrackedEntity = { inactive: 0 }

// ── TrackerEnrollment (modern API) ────────────────────────────────────────────
// status is the only required field

// @ts-expect-error — status is required
const teEnrollmentMissing: TrackerEnrollment = {}

const teEnrollment: TrackerEnrollment = { status: "COMPLETED" }

// status is an inline enum — EnrollmentStatus is not a standalone schema in v41
const teEnrollmentBadStatus: TrackerEnrollment = {
    // @ts-expect-error
    status: "EXPIRED",
}

// ── Enrollment (legacy API, still present in v41) ─────────────────────────────
// In v41, only status is required. But reference fields are now { id: string }
// objects rather than plain strings (as they were in v40).

// @ts-expect-error — status is required
const legacyMissingStatus: Enrollment = {}

const legacyEnrollment: Enrollment = {
    status: "ACTIVE",
    // program is { id: string } in v41 (unlike v40 where it was a plain string)
    program: { id: "IpHINAT79UW" },
    trackedEntityInstance: { id: "HNTA2BKtnNB" },
    organisationUnit: { id: "DiszpKrYNg8" },
}

// @ts-expect-error — program must be { id: string }, not a plain string
const legacyBadProgram: Enrollment = { status: "ACTIVE", program: "IpHINAT79UW" }

// ── Event (present in v41, absent in v42, restored in v43) ────────────────────
// status is required. Reference fields are { id: string } objects.

// @ts-expect-error — status is required
const eventMissing: Event = {}

const event: Event = {
    status: "ACTIVE",
    organisationUnit: { id: "DiszpKrYNg8" },
    programStage: { id: "A03MvHHogjR" },
}

// status enum is inline — not a standalone schema in v41
const eventBadStatus: Event = {
    // @ts-expect-error
    status: "DRAFT",
}

// ── TrackedEntityType ─────────────────────────────────────────────────────────

const tet: TrackedEntityType = {
    featureType: "NONE",
    maxTeiCountToReturn: 0,
    minAttributesRequiredToSearch: 1,
}

// @ts-expect-error — all three are required
const tetMissing: TrackedEntityType = { featureType: "NONE", maxTeiCountToReturn: 0 }

// ── TrackedEntityAttribute ────────────────────────────────────────────────────
// In v41, only aggregationType + valueType are required.
// minCharactersToSearch and preferredSearchOperator were added as required in v43.

const tea: TrackedEntityAttribute = {
    aggregationType: "NONE",
    valueType: "INTEGER",
}

// @ts-expect-error — valueType is required
const teaMissing: TrackedEntityAttribute = { aggregationType: "NONE" }
