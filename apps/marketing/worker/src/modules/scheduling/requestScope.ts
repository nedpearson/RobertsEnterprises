/**
 * Read compatibility for the Roberts organization consolidation.
 *
 * The production backfill is deliberately separate from schema migrations, so
 * deployments must tolerate both the pre- and post-consolidation row layout.
 */
const BUSINESS_ALIASES: Readonly<Record<string, readonly string[]>> = {
  '82a5b426-78a2-47ba-896b-3146b1a99c53': [
    '65ad28de-3f86-428d-a5b6-9d89af3542fc',
    '81c291ed-e9a0-430c-ab8c-7ed2216a9c62',
  ],
};

export const LOCATION_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'b7b013f4-6c5f-4ebd-bc55-290d73f969fb': ['1bf69ca1-91a2-417b-890f-79089763ae4f'],
  'f4809557-4834-41c7-a997-9046444682c0': ['244179aa-63fa-408b-9615-9f552d57edd3'],
  '22783385-f099-4ddc-a8d6-0cafd0e3ffbd': ['0d872f24-d8aa-48a7-ad3b-e9257509a6da'],
  '6c663431-dc51-467d-82e4-4f26ae4953bb': ['a31f8e83-3597-4868-a911-dc8c45612052'],
};

export function requestBusinessScope(businessId: string): string[] {
  return [businessId, ...(BUSINESS_ALIASES[businessId] || [])];
}

export function requestLocationScope(locationIds: string[]): string[] {
  return [...new Set(locationIds.flatMap((id) => [id, ...(LOCATION_ALIASES[id] || [])]))];
}
