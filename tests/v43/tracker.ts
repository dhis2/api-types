/**
 * Type tests for tracker models: TrackerTrackedEntity, TrackerEnrollment, Event.
 *
 * Tracker types follow the /api/tracker/* endpoints (not the legacy /api/trackedEntityInstances).
 * TrackerTrackedEntity has no required fields. TrackerEnrollment and Event both
 * require `status`.
 */

import type { components } from "@dhis2/api-types/v43"

type TrackerTrackedEntity = components["schemas"]["TrackerTrackedEntity"]
type TrackerEnrollment = components["schemas"]["TrackerEnrollment"]
type Event = components["schemas"]["Event"]
type EnrollmentStatus = components["schemas"]["EnrollmentStatus"]
type EventStatus = components["schemas"]["EventStatus"]

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
