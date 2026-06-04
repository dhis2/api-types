/**
 * Type tests for DataElement — the core aggregate metadata type.
 *
 * DataElement has three required fields (aggregationType, domainType, valueType)
 * because DHIS2 always returns them. All other fields are optional — a
 * ?fields=id,name response is still a valid DataElement.
 */

import type { components } from "@dhis2/api-types/v43"

type DataElement = components["schemas"]["DataElement"]
type ValueType = components["schemas"]["ValueType"]
type AggregationType = components["schemas"]["AggregationType"]
type DataElementDomain = components["schemas"]["DataElementDomain"]

// ── Required fields ──────────────────────────────────────────────────────────

// @ts-expect-error — aggregationType, domainType, valueType are all required
const missingRequired: DataElement = {}

const minimal: DataElement = {
    aggregationType: "SUM",
    domainType: "AGGREGATE",
    valueType: "INTEGER",
}

// ── Enum constraints ─────────────────────────────────────────────────────────
// Test enum types directly: cleaner than embedding bad values in multi-line objects
// (a @ts-expect-error only suppresses the error on the immediately following line).

// @ts-expect-error
const badVt: ValueType = "INVALID"

// @ts-expect-error
const badAgg: AggregationType = "MULTIPLY"

// @ts-expect-error — only AGGREGATE | TRACKER
const badDomain: DataElementDomain = "FINANCIAL"

// All enum values are plain string literals — no runtime enum object needed
const valueType: ValueType = "BOOLEAN"
const aggType: AggregationType = "AVERAGE_SUM_ORG_UNIT"
const domain: DataElementDomain = "TRACKER"

// ── Optional fields ───────────────────────────────────────────────────────────

// Any subset of optional fields is valid — mirrors a ?fields=... response
const withMeta: DataElement = {
    aggregationType: "COUNT",
    domainType: "TRACKER",
    valueType: "BOOLEAN",
    id: "fbfJHSPpUQD",
    name: "ANC 1st visit",
    shortName: "ANC 1",
    zeroIsSignificant: false,
}

// For field-level errors, the directive goes on the line directly before the bad field:
const badFieldType: DataElement = {
    aggregationType: "SUM",
    domainType: "AGGREGATE",
    valueType: "INTEGER",
    // @ts-expect-error — zeroIsSignificant is boolean, not string
    zeroIsSignificant: "yes",
}

// ── Nested types are shared component refs, not inlined ───────────────────────

// categoryCombo is IdentifiableObject — only its own fields are accepted
const withCombo: DataElement = {
    aggregationType: "SUM",
    domainType: "AGGREGATE",
    valueType: "NUMBER",
    categoryCombo: { id: "bjDvmb4bfuf" },
}

const withCategoryComboExcessProp: DataElement = {
    aggregationType: "SUM",
    domainType: "AGGREGATE",
    valueType: "NUMBER",
    categoryCombo: {
        id: "bjDvmb4bfuf",
        // @ts-expect-error — aggregationType is not a property of IdentifiableObject
        aggregationType: "SUM",
    },
}
