const PAGE_SIZE = 1000;

interface PonderPage<T> {
  items: T[];
  pageInfo: { endCursor: string | null; hasNextPage: boolean };
}

/**
 * Fetches every page of a Ponder GraphQL collection.
 *
 * The query must accept `$after: String` and `$limit: Int!` variables and
 * return a field with `{ items { ... } pageInfo { endCursor hasNextPage } }`.
 *
 * @param url       Ponder GraphQL endpoint
 * @param query     GraphQL query string (must include $after and $limit vars)
 * @param variables Base variables merged with pagination params on each page
 * @param getPage   Extracts the paginated field from the response data object
 */
export async function fetchAllPonderItems<T>(
  url: string,
  query: string,
  variables: Record<string, unknown>,
  getPage: (data: Record<string, PonderPage<T>>) => PonderPage<T>
): Promise<T[]> {
  const allItems: T[] = [];
  let cursor: string | null = null;

  do {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { ...variables, after: cursor, limit: PAGE_SIZE },
      }),
    });
    const json = await res.json();
    const page = getPage(json.data);
    allItems.push(...page.items);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor !== null);

  return allItems;
}
