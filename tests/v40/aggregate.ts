/**
 * Type tests for core aggregate metadata types in v40.
 *
 * Note: AggregationType is not a standalone schema in v40 — it is an inline
 * enum on individual schemas like DataElement and OrganisationUnit. Enum
 * constraints are verified through those types directly.
 */

import type {
    OrganisationUnit,
    DataSet,
    CategoryCombo,
    Indicator,
    Dashboard,
    DataValue,
} from "@dhis2/api-types/v40"

// ── OrganisationUnit ──────────────────────────────────────────────────────────

const ou: OrganisationUnit = { aggregationType: "SUM", level: 1 }

// @ts-expect-error — aggregationType is required
const ouMissingAgg: OrganisationUnit = { level: 1 }

// @ts-expect-error — level is required
const ouMissingLevel: OrganisationUnit = { aggregationType: "SUM" }

// AggregationType enum constraints are enforced via the schema's field type
const ouBadAgg: OrganisationUnit = {
    // @ts-expect-error — not a valid AggregationType value
    aggregationType: "GEOMETRIC_MEAN",
    level: 1,
}

// ── DataSet ───────────────────────────────────────────────────────────────────

const ds: DataSet = {
    aggregationType: "SUM",
    expiryDays: 0,
    formType: "DEFAULT",
    openFuturePeriods: 0,
    openPeriodsAfterCoEndDate: 0,
    timelyDays: 15,
    version: 1,
}

// @ts-expect-error — timelyDays is required
const dsMissing: DataSet = {
    aggregationType: "SUM",
    expiryDays: 0,
    formType: "DEFAULT",
    openFuturePeriods: 0,
    openPeriodsAfterCoEndDate: 0,
    version: 1,
}

// ── CategoryCombo ─────────────────────────────────────────────────────────────

const catCombo: CategoryCombo = { dataDimensionType: "DISAGGREGATION" }
// @ts-expect-error — dataDimensionType is required
const catComboMissing: CategoryCombo = {}

// ── Indicator ─────────────────────────────────────────────────────────────────

const ind: Indicator = { aggregationType: "SUM" }
// @ts-expect-error — aggregationType is required
const indMissing: Indicator = {}

// ── Dashboard ─────────────────────────────────────────────────────────────────

const dash: Dashboard = { itemCount: 0 }
// @ts-expect-error — itemCount is required
const dashMissing: Dashboard = { name: "My Dashboard" }

// ── DataValue ─────────────────────────────────────────────────────────────────

// All fields optional
const dv: DataValue = {}
const dvWithData: DataValue = {
    dataElement: "fbfJHSPpUQD",
    period: "202401",
    orgUnit: "ImspTQPwCqd",
    value: "12",
    followup: false,
    deleted: false,
}

// @ts-expect-error — value must be string, not number
const dvBadValue: DataValue = { value: 12 }
