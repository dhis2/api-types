/**
 * Type tests for tracker models in v40 (legacy tracker API).
 *
 * v40 uses the legacy tracker API only — there is no TrackerTrackedEntity or
 * TrackerEnrollment. The types are:
 *   - TrackedEntityInstance  (replaced by TrackerTrackedEntity in v41+)
 *   - Enrollment             (legacy, all plain string fields)
 *
 * Notable field-name differences from the modern API (v41+):
 *   - `organisationUnit`  (TEI in v40) vs `orgUnit` (TrackerTrackedEntity in v41+)
 *   - `trackedEntityType` is { id: string } in TEI (object ref, not plain string)
 *   - Enrollment uses plain strings for all its reference fields
 *   - `programInstances`  (v40 TEI) vs `enrollments` (v41+ TrackerTrackedEntity)
 */

import type {
    TrackedEntityInstance,
    Enrollment,
    TrackedEntityAttribute,
    TrackedEntityType,
} from "@dhis2/api-types/v40"

// ── TrackedEntityInstance ─────────────────────────────────────────────────────
// No required fields — equivalent in optionality to TrackerTrackedEntity in v41+

const tei: TrackedEntityInstance = {}

const teiWithData: TrackedEntityInstance = {
    id: "HNTA2BKtnNB",
    // trackedEntityType is { id: string } in v40 — an inline object ref, not a plain string
    trackedEntityType: { id: "nEenWmSyUEp" },
    // organisationUnit is also { id: string } in v40 TEI (not a plain string)
    organisationUnit: { id: "DiszpKrYNg8" },
    inactive: false,
    potentialDuplicate: false,
}

// @ts-expect-error — inactive must be boolean
const teiBadInactive: TrackedEntityInstance = { inactive: "no" }

// trackedEntityType is { id: string }, not a plain string
const teiBadType: TrackedEntityInstance = {
    // @ts-expect-error — must be { id: string }, not a bare string
    trackedEntityType: "nEenWmSyUEp",
}

// programInstances is the v40 name for enrollments (v41+ uses `enrollments`)
const teiWithPrograms: TrackedEntityInstance = {
    programInstances: [{ id: "mfCOxMNjPHO" }],
}

// ── Enrollment (legacy v40) ───────────────────────────────────────────────────
// Unlike TrackerEnrollment in v41+ (status only), v40 Enrollment has many required
// fields — all typed as plain strings, including references like program and orgUnit.

const enrollment: Enrollment = {
    status: "ACTIVE",
    program: "IpHINAT79UW",
    trackedEntityInstance: "HNTA2BKtnNB",
    trackedEntityType: "nEenWmSyUEp",
    orgUnit: "DiszpKrYNg8",
    enrollment: "mfCOxMNjPHO",
    enrollmentDate: "2024-01-15T08:00:00.000Z",
    incidentDate: "2024-01-15T08:00:00.000Z",
    created: "2024-01-15T08:00:00.000Z",
    lastUpdated: "2024-01-15T08:00:00.000Z",
    createdAtClient: "2024-01-15T08:00:00.000Z",
    lastUpdatedAtClient: "2024-01-15T08:00:00.000Z",
}

// @ts-expect-error — enrollmentDate is required in v40 legacy Enrollment
const enrollmentMissingDate: Enrollment = {
    status: "ACTIVE",
    program: "IpHINAT79UW",
    trackedEntityInstance: "HNTA2BKtnNB",
    trackedEntityType: "nEenWmSyUEp",
    orgUnit: "DiszpKrYNg8",
    enrollment: "mfCOxMNjPHO",
    incidentDate: "2024-01-15T08:00:00.000Z",
    created: "2024-01-15T08:00:00.000Z",
    lastUpdated: "2024-01-15T08:00:00.000Z",
    createdAtClient: "2024-01-15T08:00:00.000Z",
    lastUpdatedAtClient: "2024-01-15T08:00:00.000Z",
}

// ── TrackedEntityType ─────────────────────────────────────────────────────────

const tet: TrackedEntityType = {
    featureType: "NONE",
    maxTeiCountToReturn: 0,
    minAttributesRequiredToSearch: 1,
}

// @ts-expect-error — minAttributesRequiredToSearch is required
const tetMissing: TrackedEntityType = { featureType: "NONE", maxTeiCountToReturn: 0 }

// ── TrackedEntityAttribute ────────────────────────────────────────────────────
// In v40, only aggregationType and valueType are required.
// minCharactersToSearch and preferredSearchOperator were added as required in v43.

const tea: TrackedEntityAttribute = {
    aggregationType: "NONE",
    valueType: "TEXT",
    id: "w75KJ2mc4zz",
    name: "First name",
}

// @ts-expect-error — valueType is required
const teaMissing: TrackedEntityAttribute = { aggregationType: "NONE" }
