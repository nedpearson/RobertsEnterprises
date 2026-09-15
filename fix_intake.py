import re

file_path = "apps/marketing/worker/src/modules/scheduling/publicIntake.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update chooseWebsiteSubmissionLocation
choose_old = """  const cityCatalogMatches = Object.values(STORE_CATALOG)
    .filter((spec) => hint.includes(normalizeLabel(spec.city)))
    .map((spec) => normalizeLabel(spec.city));
  const cityMatches = uniqueRows.filter((row) => cityCatalogMatches.some((city) => normalizeLabel(row.name).includes(city)));
  if (cityMatches.length === 1) return cityMatches[0];

  if (uniqueRows.length === 1) return uniqueRows[0];
  throw new Error(`Could not map submitted location "${locationHint}" to a single configured location.`);"""

choose_new = """  const cityCatalogMatches = Object.values(STORE_CATALOG)
    .filter((spec) => hint.includes(normalizeLabel(spec.city)))
    .map((spec) => normalizeLabel(spec.city));
  const cityMatches = uniqueRows.filter((row) => cityCatalogMatches.some((city) => normalizeLabel(row.name).includes(city)));
  if (cityMatches.length === 1) return cityMatches[0];

  return { id: null, name: null }; // Requires manual location review
"""
content = content.replace(choose_old, choose_new)

choose_sig_old = """export function chooseWebsiteSubmissionLocation(
  rows: Array<{ id: string; name: string | null }>,
  locationHint: string,
): { id: string; name: string | null } {"""
choose_sig_new = """export function chooseWebsiteSubmissionLocation(
  rows: Array<{ id: string; name: string | null }>,
  locationHint: string,
): { id: string | null; name: string | null } {"""
content = content.replace(choose_sig_old, choose_sig_new)

# Update resolveWebsiteSubmissionIntake
resolve_site_old = """  const siteForLocation = matches.filter((site) => String(site.location_id ?? '') === chosen.id);
  let site: Record<string, unknown>;
  if (siteForLocation.length === 1) site = siteForLocation[0];
  else if (siteForLocation.length > 1) {
    throw new Error(`Website domain "${domain}" has duplicate booking mappings for location "${chosen.name ?? locationHint}".`);
  } else if (matches.length === 1) {
    // One site can represent a multi-location brand. The form's location choice
    // supplies the operational location while the site row remains the source.
    site = matches[0];
  } else {
    throw new Error(`Website domain "${domain}" has multiple site rows and none is assigned to location "${chosen.name ?? locationHint}".`);
  }"""
resolve_site_new = """  let site: Record<string, unknown>;
  if (!chosen.id && matches.length === 1) {
    site = matches[0];
  } else {
    const siteForLocation = matches.filter((site) => String(site.location_id ?? '') === chosen.id);
    if (siteForLocation.length === 1) site = siteForLocation[0];
    else if (siteForLocation.length > 1) {
      throw new Error(`Website domain "${domain}" has duplicate booking mappings for location "${chosen.name ?? locationHint}".`);
    } else if (matches.length === 1) {
      site = matches[0];
    } else {
      throw new Error(`Website domain "${domain}" has multiple site rows and none is assigned to location "${chosen.name ?? locationHint}".`);
    }
  }"""
content = content.replace(resolve_site_old, resolve_site_new)

# Update the return type of ResolvedWebsiteIntake
content = content.replace(
    'locationId: string;',
    'locationId: string | null;'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated publicIntake.ts")
