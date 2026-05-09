export function normalizeCatalogName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeCatalogSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function uniqueDefinitions(definitions) {
  const seen = new Set();
  const unique = [];

  for (const definition of definitions) {
    const slug = normalizeCatalogSlug(definition.canonicalSlug ?? definition.slug);
    const name = normalizeCatalogName(definition.canonicalName ?? definition.name);
    const key = slug ? `slug:${slug}` : `name:${name}`;
    if (!name || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push({
      ...definition,
      canonicalSlug: slug || null,
      canonicalName: definition.canonicalName ?? definition.name,
    });
  }

  return unique;
}

function assertNotPrefixed(definitions, prefix) {
  const prefixed = definitions
    .map((definition) => definition.canonicalName ?? definition.name)
    .filter((name) => String(name ?? "").trim().startsWith(prefix));

  if (prefixed.length > 0) {
    throw new Error(`Canonical exercise resolver refuses prefixed exercise names: ${prefixed.join(", ")}`);
  }
}

export async function resolveCanonicalExercises(client, definitions, {
  prefix = "[ZAC-LLEL]",
  select = "id, name, slug, is_global, user_id, measurement_type, equipment",
} = {}) {
  const unique = uniqueDefinitions(definitions);
  assertNotPrefixed(unique, prefix);

  const names = [...new Set(unique.map((definition) => definition.canonicalName ?? definition.name).filter(Boolean))];
  const slugs = [...new Set(unique.map((definition) => definition.canonicalSlug).filter(Boolean))];
  let rows = [];

  if (names.length > 0 || slugs.length > 0) {
    const { data, error } = await client
      .from("exercises")
      .select(select)
      .eq("is_global", true)
      .range(0, 5000);

    if (error) {
      throw new Error(`Unable to resolve canonical exercises: ${error.message ?? "Unknown Supabase error"}`);
    }

    rows = data ?? [];
  }

  const byName = new Map();
  const bySlug = new Map();
  for (const row of rows) {
    if (!row.is_global || row.user_id) {
      continue;
    }

    const nameKey = normalizeCatalogName(row.name);
    if (nameKey && !byName.has(nameKey)) {
      byName.set(nameKey, row);
    }

    const slugKey = normalizeCatalogSlug(row.slug);
    if (slugKey && !bySlug.has(slugKey)) {
      bySlug.set(slugKey, row);
    }
  }

  const mapping = new Map();
  const missing = [];
  for (const definition of unique) {
    const slugKey = normalizeCatalogSlug(definition.canonicalSlug);
    const nameKey = normalizeCatalogName(definition.canonicalName ?? definition.name);
    const row = (slugKey ? bySlug.get(slugKey) : null) ?? byName.get(nameKey);
    if (!row) {
      missing.push(definition.canonicalName ?? definition.name);
      continue;
    }

    mapping.set(definition.name, row);
  }

  if (missing.length > 0) {
    throw new Error(`Missing canonical global exercises: ${missing.join(", ")}. Add them through the canonical catalog before seeding human-account LLEL.`);
  }

  return {
    mapping,
    resolved: unique.map((definition) => {
      const row = mapping.get(definition.name);
      return {
        requestedName: definition.name,
        canonicalName: row.name,
        canonicalSlug: row.slug ?? null,
        exerciseId: row.id,
        isGlobal: row.is_global === true,
      };
    }),
  };
}
