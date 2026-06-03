/**
 * Fetches the DHIS2 OpenAPI spec for each configured version and saves it
 * under specs/vN.json. Skips versions where a spec file already exists unless
 * --force is passed.
 *
 * Usage:
 *   tsx scripts/fetch-specs.ts [--force] [--version v42]
 *
 * Environment variables:
 *   DHIS2_USERNAME  Basic auth username (default: admin)
 *   DHIS2_PASSWORD  Basic auth password (default: district)
 */

import { writeFileSync, existsSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { VERSIONS } from "./versions.ts"

const ROOT = resolve(fileURLToPath(import.meta.url), "../..")
const SPECS_DIR = resolve(ROOT, "specs")

const args = process.argv.slice(2)
const force = args.includes("--force")
const versionFilter = args.includes("--version")
    ? args[args.indexOf("--version") + 1]
    : null

const username = process.env.DHIS2_USERNAME ?? "admin"
const password = process.env.DHIS2_PASSWORD ?? "district"
const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`

mkdirSync(SPECS_DIR, { recursive: true })

const targets = versionFilter
    ? VERSIONS.filter((v) => v.version === versionFilter)
    : VERSIONS

if (targets.length === 0) {
    console.error(`No version found matching: ${versionFilter}`)
    process.exit(1)
}

let failed = false

for (const { version, url } of targets) {
    const outPath = resolve(SPECS_DIR, `${version}.json`)

    if (!force && existsSync(outPath)) {
        console.log(`[${version}] Skipping — spec already exists (use --force to re-fetch)`)
        continue
    }

    process.stdout.write(`[${version}] Fetching ${url} ... `)

    try {
        const response = await fetch(url, {
            headers: { Authorization: authHeader },
        })

        if (!response.ok) {
            console.error(`\n[${version}] HTTP ${response.status} ${response.statusText}`)
            failed = true
            continue
        }

        const spec = await response.json()
        writeFileSync(outPath, JSON.stringify(spec, null, 2))
        console.log(`done → specs/${version}.json`)
    } catch (err) {
        console.error(`\n[${version}] Failed: ${(err as Error).message}`)
        failed = true
    }
}

if (failed) {
    process.exit(1)
}
