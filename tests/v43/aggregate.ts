/**
 * Type tests for core aggregate metadata types in v43.
 *
 * Covers the types most commonly used across DHIS2 front-end applications:
 * OrganisationUnit, DataSet, CategoryCombo, Category, Indicator, Program,
 * Dashboard, and DataValue.
 */

import type {
    OrganisationUnit,
    DataSet,
    CategoryCombo,
    Category,
    Indicator,
    Program,
    Dashboard,
    DataValue,
    AggregationType,
    DataDimensionType,
    ProgramType,
    FeatureType,
    FormType,
} from "@dhis2/api-types/v43"

// ── OrganisationUnit ──────────────────────────────────────────────────────────
// Required: aggregationType, level

const ou: OrganisationUnit = {
    aggregationType: "SUM",
    level: 1,
    id: "ImspTQPwCqd",
    name: "Sierra Leone",
}

// @ts-expect-error — aggregationType is required
const ouMissingAggType: OrganisationUnit = { level: 2 }

// @ts-expect-error — level is required
const ouMissingLevel: OrganisationUnit = { aggregationType: "COUNT" }

// Optional geometry field accepts GeoJSON-like objects
const ouWithGeometry: OrganisationUnit = {
    aggregationType: "SUM",
    level: 1,
    openingDate: "2010-01-01",
    closedDate: "2025-12-31",
}

// ── DataSet ───────────────────────────────────────────────────────────────────
// Required: aggregationType, expiryDays, formType, openFuturePeriods,
//           openPeriodsAfterCoEndDate, timelyDays, version

const ds: DataSet = {
    aggregationType: "SUM",
    expiryDays: 0,
    formType: "DEFAULT",
    openFuturePeriods: 0,
    openPeriodsAfterCoEndDate: 0,
    timelyDays: 15,
    version: 1,
    id: "pBOMPrpg1QX",
    name: "Child Health",
}

// @ts-expect-error — formType is required
const dsMissingFormType: DataSet = {
    aggregationType: "SUM",
    expiryDays: 0,
    openFuturePeriods: 0,
    openPeriodsAfterCoEndDate: 0,
    timelyDays: 15,
    version: 1,
}

// formType is a constrained enum
const dsCustomForm: DataSet = { ...ds, formType: "SECTION" }
// @ts-expect-error — not a valid FormType
const dsBadForm: DataSet = { ...ds, formType: "SPREADSHEET" }

// ── CategoryCombo ─────────────────────────────────────────────────────────────
// Required: dataDimensionType

const catCombo: CategoryCombo = {
    dataDimensionType: "DISAGGREGATION",
    id: "bjDvmb4bfuf",
    name: "default",
}

// @ts-expect-error — dataDimensionType is required
const catComboMissing: CategoryCombo = { name: "default" }

// @ts-expect-error — only DISAGGREGATION | ATTRIBUTE are valid
const catComboBadDim: CategoryCombo = { dataDimensionType: "BREAKDOWN" }

// ── Category ──────────────────────────────────────────────────────────────────
// Required: aggregationType, dataDimensionType, valueType

const cat: Category = {
    aggregationType: "SUM",
    dataDimensionType: "DISAGGREGATION",
    valueType: "TEXT",
    id: "GLevLNI9wkl",
    name: "Gender",
}

const dimType: DataDimensionType = "ATTRIBUTE"
// @ts-expect-error
const dimTypeBad: DataDimensionType = "SPLIT"

// ── Indicator ─────────────────────────────────────────────────────────────────
// Required: aggregationType

const ind: Indicator = {
    aggregationType: "SUM",
    id: "fbfJHSPpUQD",
    name: "ANC 1 Coverage",
}

// @ts-expect-error — aggregationType is required
const indMissing: Indicator = { name: "ANC 1 Coverage" }

// Numerator and denominator are optional strings (formula expressions)
const indWithFormula: Indicator = {
    aggregationType: "SUM",
    numerator: "#{fbfJHSPpUQD}",
    denominator: "#{DE_600001}",
    numeratorDescription: "ANC 1st visits",
    denominatorDescription: "Population < 1 year",
}

// ── Program ───────────────────────────────────────────────────────────────────
// Required: accessLevel, completeEventsExpiryDays, expiryDays, featureType,
//           maxTeiCountToReturn, minAttributesRequiredToSearch,
//           openDaysAfterCoEndDate, programType, version
// Use declare — many required fields; what matters is programType and accessLevel

declare const program: Program

// programType distinguishes tracker vs aggregate programs
const programType: ProgramType = "WITH_REGISTRATION"
// @ts-expect-error
const programTypeBad: ProgramType = "STANDALONE"

const accessLevel: Program["accessLevel"] = "PROTECTED"
// @ts-expect-error
const accessLevelBad: Program["accessLevel"] = "PRIVATE"

const featureType: FeatureType = "POINT"
// @ts-expect-error
const featureTypeBad: FeatureType = "LINE"

// ── Dashboard ─────────────────────────────────────────────────────────────────
// Required: itemCount

const dash: Dashboard = {
    itemCount: 0,
    id: "iMnYyBfSxmM",
    name: "Antenatal Care",
}

// @ts-expect-error — itemCount is required
const dashMissing: Dashboard = { name: "Antenatal Care" }

// dashboardItems is optional — a list of charts, maps, tables etc.
const dashWithItems: Dashboard = {
    itemCount: 2,
    dashboardItems: [{ id: "abc123" }],
}

// ── DataValue ─────────────────────────────────────────────────────────────────
// All fields optional — aggregate data values are partial by nature

const dv: DataValue = {}

const dvFull: DataValue = {
    dataElement: "fbfJHSPpUQD",
    period: "202401",
    orgUnit: "ImspTQPwCqd",
    categoryOptionCombo: "HllvX50cXC0",
    attributeOptionCombo: "HllvX50cXC0",
    value: "42",
    storedBy: "admin",
    created: "2024-01-15T08:00:00.000Z",
    lastUpdated: "2024-01-15T08:00:00.000Z",
    followup: false,
    deleted: false,
}

// value is always a string — DHIS2 serialises all data values as strings
const dvBadValue: DataValue = {
    // @ts-expect-error — value must be string, not number
    value: 42,
}

// ── AggregationType is shared across all aggregate types ─────────────────────

const agg: AggregationType = "AVERAGE_SUM_ORG_UNIT"
// @ts-expect-error
const aggBad: AggregationType = "WEIGHTED_AVERAGE"

const formType: FormType = "SECTION_MULTIORG"
// @ts-expect-error
const formTypeBad: FormType = "GRID"
