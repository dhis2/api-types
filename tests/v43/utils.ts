/**
 * Type tests for GistModel and PickWithFieldFilters — using v43 types.
 *
 * Each assignment is a type assertion: if it compiles, the type is correct.
 * Lines marked @ts-expect-error assert that an assignment must fail.
 */

import type { components } from "@dhis2/api-types/v43"
import type { GistModel, PickWithFieldFilters, PagedResponse } from "@dhis2/api-types/utils"

type DataElement = components["schemas"]["DataElement"]
type Event = components["schemas"]["Event"]

// ── GistModel ─────────────────────────────────────────────────────────────────

type DEGist = GistModel<DataElement>

// Arrays → number (the count)
const gistArrayField: DEGist["aggregationLevels"] = 3
// @ts-expect-error — array fields become number, not an array
const gistArrayFieldBad: DEGist["aggregationLevels"] = []

// Object references → string (the UID / href)
const gistRef: DEGist["categoryCombo"] = "bjDvmb4bfuf"
// @ts-expect-error — object fields become string, not an object
const gistRefBad: DEGist["categoryCombo"] = { id: "bjD" }

// String scalars → unchanged
const gistScalar: DEGist["name"] = "ANC 1st visit"
// @ts-expect-error — string fields stay string, not number
const gistScalarBad: DEGist["name"] = 42

// String enum types → unchanged (string literal union, not an object)
// Critical: enums are primitives, not collapsed to bare string
const gistEnum: DEGist["aggregationType"] = "SUM"
// @ts-expect-error — enum constraints are preserved in gist
const gistEnumBad: DEGist["aggregationType"] = "INVALID"

// Boolean scalars → unchanged
const gistBool: DEGist["favorite"] = true
// @ts-expect-error — boolean stays boolean, not string
const gistBoolBad: DEGist["favorite"] = "yes"

// Optional fields stay optional in gist
const gistOptional: DEGist["categoryCombo"] = undefined

// GistModel works on tracker types too
type EventGist = GistModel<Event>

const gistEventStatus: EventGist["status"] = "ACTIVE"
// @ts-expect-error — EventStatus enum is preserved in gist
const gistEventStatusBad: EventGist["status"] = "INVALID"

// dataValues is an array → becomes number in gist
const gistDataValues: EventGist["dataValues"] = 5
// @ts-expect-error — array fields become number in gist
const gistDataValuesBad: EventGist["dataValues"] = []

// ── PickWithFieldFilters ──────────────────────────────────────────────────────

// --- Flat pick ---
// Mirrors ?fields=id,name,valueType
// valueType is required in DataElement, so it stays required in the pick
type DEFlat = PickWithFieldFilters<DataElement, ["id", "name", "valueType"]>

const flat: DEFlat = { id: "fbfJHSPpUQD", name: "ANC 1st visit", valueType: "INTEGER" }

// Optional fields (id, name) can be omitted; required fields (valueType) cannot
const flatOptionalOmitted: DEFlat = { valueType: "TEXT" }

// Enum constraints are preserved in the picked type
const flatEnum: DEFlat = { valueType: "BOOLEAN" }
const flatEnumBad: DEFlat = {
    // @ts-expect-error — invalid value for valueType
    valueType: "INVALID",
}

// Fields not in the filter are rejected as excess properties
const flatBadField: DEFlat = {
    id: "fbfJHSPpUQD",
    valueType: "INTEGER",
    // @ts-expect-error — aggregationType was not in the filter
    aggregationType: "SUM",
}

// --- Nested pick ---
// Mirrors ?fields=id,categoryCombo[id,name]
// categoryCombo is IdentifiableObject, which has id, name, code, href, etc.
type DEWithCombo = PickWithFieldFilters<DataElement, ["id", "categoryCombo[id,name]"]>

const withCombo: DEWithCombo = {
    id: "fbfJHSPpUQD",
    categoryCombo: { id: "bjDvmb4bfuf", name: "default" },
}

// Nested fields are always optional — the API may omit absent values
const withComboAbsent: DEWithCombo = { id: "fbfJHSPpUQD" }
const withComboUndefined: DEWithCombo = { id: "fbfJHSPpUQD", categoryCombo: undefined }

const withComboBad: DEWithCombo = {
    id: "fbfJHSPpUQD",
    categoryCombo: {
        id: "bjDvmb4bfuf",
        // @ts-expect-error — code was not in the nested filter
        code: "DEFAULT",
    },
}

// --- Array field nested pick ---
// Mirrors ?fields=status,dataValues[dataElement,value]
// dataValues is TrackerDataValue[] — a concrete type, so nesting works fully
type EventPick = PickWithFieldFilters<Event, ["status", "dataValues[dataElement,value]"]>

const eventPick: EventPick = {
    status: "ACTIVE",
    dataValues: [{ dataElement: "fbfJHSPpUQD", value: "1" }],
}

const eventPickEmpty: EventPick = { status: "SCHEDULE", dataValues: [] }

const eventPickBad: EventPick = {
    status: "COMPLETED",
    dataValues: [{
        dataElement: "abc",
        value: "1",
        // @ts-expect-error — createdAt was not in the nested filter
        createdAt: "2024-01-01",
    }],
}

// ── PagedResponse ──────────────────────────────────────────────────────────────

type DataElementsPage = PagedResponse<DataElement, "dataElements">

// Valid full response — pager + array under the resource key
const page: DataElementsPage = {
    pager: { page: 1, pageCount: 10, total: 500, pageSize: 50 },
    dataElements: [{ aggregationType: "SUM", domainType: "AGGREGATE", valueType: "INTEGER" }],
}

// Empty page is valid
const emptyPage: DataElementsPage = {
    pager: { page: 1, pageCount: 0, total: 0, pageSize: 50 },
    dataElements: [],
}

// prevPage and nextPage are optional on pager
const pageWithLinks: DataElementsPage = {
    pager: {
        page: 2,
        pageCount: 10,
        total: 500,
        pageSize: 50,
        prevPage: "https://play.dhis2.org/api/dataElements?page=1",
        nextPage: "https://play.dhis2.org/api/dataElements?page=3",
    },
    dataElements: [],
}

// @ts-expect-error — pager is required
const pageNoPager: DataElementsPage = { dataElements: [] }

// @ts-expect-error — dataElements array is required
const pageNoData: DataElementsPage = { pager: { page: 1, pageCount: 1, total: 0, pageSize: 50 } }

const pageBadDataElements: DataElementsPage = {
    pager: { page: 1, pageCount: 1, total: 1, pageSize: 50 },
    // @ts-expect-error — must be DataElement[], not a plain object
    dataElements: { id: "abc" },
}

// Key determines the resource array name — different resources use different keys
type EventsPage = PagedResponse<Event, "events">

const eventsPage: EventsPage = {
    pager: { page: 1, pageCount: 5, total: 250, pageSize: 50 },
    events: [{ status: "ACTIVE" }],
}

const eventsPageWrongKey: EventsPage = {
    pager: { page: 1, pageCount: 5, total: 250, pageSize: 50 },
    // @ts-expect-error — "dataElements" is not the right key for EventsPage
    dataElements: [],
}

// PagedResponse composes with PickWithFieldFilters — narrow items to requested fields
type DataElementRow = PickWithFieldFilters<DataElement, ["id", "name", "valueType"]>
type DataElementsPickedPage = PagedResponse<DataElementRow, "dataElements">

const pickedPage: DataElementsPickedPage = {
    pager: { page: 1, pageCount: 2, total: 75, pageSize: 50 },
    dataElements: [{ id: "fbfJHSPpUQD", name: "ANC 1st visit", valueType: "TEXT" }],
}

// --- Both array forms are equivalent ---
// ["id", "name", "valueType"] and ["id,name,valueType"] produce the same type
type DEArray = PickWithFieldFilters<DataElement, ["id", "name", "valueType"]>
type DEComma = PickWithFieldFilters<DataElement, ["id,name,valueType"]>

const fromArray: DEArray = { id: "abc", name: "ANC", valueType: "TEXT" }
const fromComma: DEComma = { id: "abc", name: "ANC", valueType: "TEXT" }

const commaBad: DEComma = {
    id: "abc",
    name: "ANC",
    valueType: "TEXT",
    // @ts-expect-error — aggregationType not in filter
    aggregationType: "SUM",
}
