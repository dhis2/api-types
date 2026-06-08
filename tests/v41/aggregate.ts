/**
 * Type tests for core aggregate metadata types in v41.
 *
 * Note: AggregationType is not a standalone schema in v41 — it is an inline
 * enum on individual schemas. Enum constraints are verified through those types.
 */

import type {
    OrganisationUnit,
    DataSet,
    CategoryCombo,
    Indicator,
    Dashboard,
    DataValue,
} from "@dhis2/api-types/v41"

// ── OrganisationUnit ──────────────────────────────────────────────────────────

const ou: OrganisationUnit = { aggregationType: "SUM", level: 3 }

// @ts-expect-error — level is required
const ouMissing: OrganisationUnit = { aggregationType: "SUM" }

const ouBadAgg: OrganisationUnit = {
    // @ts-expect-error — not a valid AggregationType
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

// @ts-expect-error — version is required
const dsMissing: DataSet = {
    aggregationType: "SUM",
    expiryDays: 0,
    formType: "DEFAULT",
    openFuturePeriods: 0,
    openPeriodsAfterCoEndDate: 0,
    timelyDays: 15,
}

// ── CategoryCombo ─────────────────────────────────────────────────────────────

const catCombo: CategoryCombo = { dataDimensionType: "ATTRIBUTE" }
// @ts-expect-error — dataDimensionType is required
const catComboMissing: CategoryCombo = {}

// ── Indicator ─────────────────────────────────────────────────────────────────

const ind: Indicator = { aggregationType: "COUNT" }
// @ts-expect-error — aggregationType is required
const indMissing: Indicator = { name: "ANC 1" }

// ── Dashboard ─────────────────────────────────────────────────────────────────

const dash: Dashboard = { itemCount: 5 }
// @ts-expect-error — itemCount is required
const dashMissing: Dashboard = {}

// ── DataValue ─────────────────────────────────────────────────────────────────

const dv: DataValue = {}
const dvWithData: DataValue = {
    dataElement: "fbfJHSPpUQD",
    period: "202401",
    orgUnit: "ImspTQPwCqd",
    value: "99",
    followup: false,
}

// @ts-expect-error — value is string, not number
const dvBadValue: DataValue = { value: 99 }
