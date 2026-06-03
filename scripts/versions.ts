// DHIS2 API versions to generate types for.
// Update this list when DHIS2 releases a new major version:
// - Add the new version
// - Remove the oldest one
// - Update the package.json version, exports, and typesVersions fields
// - Update the GitHub Actions matrix

export const VERSIONS = [
  {
    version: "v40",
    // DHIS2 Play server for version 40. Replace if a stable instance is available.
    url: "https://play.im.dhis2.org/stable-2-40-11/api/openapi.json",
  },
  {
    version: "v41",
    url: "https://play.im.dhis2.org/stable-2-41-8-1/api/openapi.json",
  },
  {
    version: "v42",
    url: "https://play.im.dhis2.org/stable-2-42-4-1/api/openapi.json",
  },
] as const;

export type ApiVersion = (typeof VERSIONS)[number]["version"];
