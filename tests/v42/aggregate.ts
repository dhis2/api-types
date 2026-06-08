/**
 * Type tests for core aggregate metadata types in v42.
 * Aggregate schemas are stable across v40–v43; this file confirms they
 * compile correctly against the v42 spec specifically.
 */

import type {
    OrganisationUnit,
    DataSet,
    CategoryCombo,
    Indicator,
    Dashboard,
    DataValue,
    AggregationType,
} from "@dhis2/api-types/v42"

// ── OrganisationUnit ──────────────────────────────────────────────────────────

const ou: OrganisationUnit = { aggregationType: "SUM", level: 2 }

// @ts-expect-error — both required fields must be present
const ouMissing: OrganisationUnit = { level: 2 }

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

// @ts-expect-error — formType is required
const dsMissing: DataSet = {
    aggregationType: "SUM",
    expiryDays: 0,
    openFuturePeriods: 0,
    openPeriodsAfterCoEndDate: 0,
    timelyDays: 15,
    version: 1,
}

// @ts-expect-error
const dsBadForm: DataSet = { ...ds, formType: "EXCEL" }

// ── CategoryCombo ─────────────────────────────────────────────────────────────

const catCombo: CategoryCombo = { dataDimensionType: "DISAGGREGATION" }
// @ts-expect-error — dataDimensionType is required
const catComboMissing: CategoryCombo = { name: "default" }

// ── Indicator ─────────────────────────────────────────────────────────────────

const ind: Indicator = { aggregationType: "SUM", name: "ANC 1 Coverage" }
// @ts-expect-error — aggregationType is required
const indMissing: Indicator = { name: "ANC 1 Coverage" }

// ── Dashboard ─────────────────────────────────────────────────────────────────

const dash: Dashboard = { itemCount: 3 }
// @ts-expect-error — itemCount is required
const dashMissing: Dashboard = { name: "Antenatal Care" }

// ── DataValue ─────────────────────────────────────────────────────────────────

// All optional in v42 too
const dv: DataValue = {}
const dvWithData: DataValue = {
    dataElement: "fbfJHSPpUQD",
    period: "202401",
    orgUnit: "ImspTQPwCqd",
    value: "17",
}

// @ts-expect-error — value must be string
const dvBadValue: DataValue = { value: 17 }

// ── AggregationType shared enum ───────────────────────────────────────────────

const agg: AggregationType = "LAST_IN_PERIOD"
// @ts-expect-error
const aggBad: AggregationType = "MEDIAN"
