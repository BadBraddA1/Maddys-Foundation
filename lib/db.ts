import { createClient, type Client, type InValue } from "@libsql/client"

export type SqlRow = Record<string, unknown>

export type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<SqlRow[]>
  query: (query: string, args?: unknown[]) => Promise<SqlRow[]>
  execute: (query: string, args?: unknown[]) => Promise<{ rowsAffected: number; lastInsertRowid?: bigint }>
}

let _client: Client | null = null

function getClient(): Client {
  if (_client) return _client

  const url =
    process.env.TURSO_DATABASE_URL ||
    process.env.TURSO_URL ||
    process.env.LIBSQL_URL

  const authToken =
    process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN

  if (!url) {
    throw new Error(
      "Turso database URL is not set. Configure TURSO_DATABASE_URL in your environment.",
    )
  }

  _client = createClient({ url, authToken })
  return _client
}

export function normalizeSql(query: string): string {
  return query
    .replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/::(int|integer|numeric|text|boolean|jsonb|date|timestamp)\b/gi, "")
    .replace(/\s+NULLS\s+(FIRST|LAST)\b/gi, "")
    .replace(/\bILIKE\b/gi, "LIKE")
}

function buildTemplateQuery(
  strings: TemplateStringsArray,
  values: unknown[],
): { sql: string; args: InValue[] } {
  let sql = ""
  const args: InValue[] = []

  for (let i = 0; i < strings.length; i++) {
    sql += strings[i]
    if (i >= values.length) continue
    sql += "?"
    args.push(values[i] as InValue)
  }

  return { sql: normalizeSql(sql), args }
}

async function executeQuery(query: string, args: unknown[] = []): Promise<SqlRow[]> {
  const client = getClient()
  const result = await client.execute({
    sql: normalizeSql(query),
    args: args as InValue[],
  })
  return result.rows as SqlRow[]
}

async function executeMutation(
  query: string,
  args: unknown[] = [],
): Promise<{ rowsAffected: number; lastInsertRowid?: bigint }> {
  const client = getClient()
  const result = await client.execute({
    sql: normalizeSql(query),
    args: args as InValue[],
  })
  return {
    rowsAffected: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid,
  }
}

async function sqlTag(strings: TemplateStringsArray, ...values: unknown[]): Promise<SqlRow[]> {
  const { sql, args } = buildTemplateQuery(strings, values)
  const client = getClient()
  const result = await client.execute({ sql, args })
  return result.rows as SqlRow[]
}

export const sql = new Proxy(function () {} as unknown as SqlClient, {
  apply(_target, _thisArg, args: unknown[]) {
    const strings = args[0] as TemplateStringsArray
    const values = args.slice(1)
    return sqlTag(strings, ...values)
  },
  get(_target, prop: string | symbol) {
    if (prop === "query") return executeQuery
    if (prop === "execute") return executeMutation
    return undefined
  },
}) as SqlClient
