/**
 * Generates TypeScript type definitions from the OpenAPI spec snapshots in specs/
 * and writes them to src/vN.d.ts.
 *
 * Requires specs to already be present — run `npm run fetch-specs` first.
 *
 * Usage:
 *   tsx scripts/generate.ts [--version v42]
 */

import openapiTS, { astToString } from "openapi-typescript"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { VERSIONS } from "./versions.ts"

const ROOT = resolve(fileURLToPath(import.meta.url), "../..")
const SPECS_DIR = resolve(ROOT, "specs")
const SRC_DIR = resolve(ROOT, "src")

const args = process.argv.slice(2)
const versionFilter = args.includes("--version")
    ? args[args.indexOf("--version") + 1]
    : null

mkdirSync(SRC_DIR, { recursive: true })

const targets = versionFilter
    ? VERSIONS.filter((v) => v.version === versionFilter)
    : VERSIONS

if (targets.length === 0) {
    console.error(`No version found matching: ${versionFilter}`)
    process.exit(1)
}

let failed = false

for (const { version } of targets) {
    const specPath = resolve(SPECS_DIR, `${version}.json`)
    const outPath = resolve(SRC_DIR, `${version}.d.ts`)

    if (!existsSync(specPath)) {
        console.error(`[${version}] Missing spec file: specs/${version}.json — run 'npm run fetch-specs' first`)
        failed = true
        continue
    }

    process.stdout.write(`[${version}] Generating types ... `)

    try {
        const specRaw = readFileSync(specPath, "utf-8")
            .replace(/"#\/components\/parameters\/GetObjectListParams\.filters"/g, '"#/components/parameters/GetObjectListParams.filter"')
            .replace(/"#\/components\/parameters\/GetObjectListParams\.orders"/g, '"#/components/parameters/GetObjectListParams.order"')
        const spec = JSON.parse(specRaw)
        const ast = await openapiTS(spec)

        const schemaNames = Object.keys(spec.components?.schemas ?? {})
        const aliases = schemaNames
            .map((name) => `export type ${name} = components["schemas"]["${name}"]`)
            .join("\n")

        const output = [
            `// Generated from DHIS2 OpenAPI spec — do not edit manually.`,
            `// Re-generate with: npm run generate`,
            ``,
            astToString(ast),
            `// Named aliases for every schema — import directly instead of via components["schemas"]`,
            aliases,
        ].join("\n")

        writeFileSync(outPath, output)
        console.log(`done → src/${version}.d.ts`)
    } catch (err) {
        console.error(`\n[${version}] Failed: ${(err as Error).message}`)
        failed = true
    }
}

if (failed) {
    process.exit(1)
}
