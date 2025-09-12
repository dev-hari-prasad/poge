import { NextRequest, NextResponse } from 'next/server'
import { dbPool, type PoolKey } from '@/lib/db-pool'

function isSystemSchema(name: string): boolean {
  return name === 'pg_catalog' || name === 'information_schema'
}

export async function POST(req: NextRequest) {
  try {
    const { host, port, user, password, database, sslMode } = await req.json()
    if (!host || !port || !user || !database) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const poolConfig: PoolKey = {
      host,
      port,
      user,
      password,
      database,
      ssl: sslMode === 'require',
    }

    // Fetch schemas
    const schemasRes = await dbPool.query(poolConfig, `
      SELECT schema_name
      FROM information_schema.schemata
      ORDER BY schema_name
    `)

    const schemas = (schemasRes.rows as Array<{ schema_name: string }>)
      .map(r => r.schema_name)
      .filter(s => !isSystemSchema(s))

    // Fetch tables and views metadata
    const tablesRes = await dbPool.query(poolConfig, `
      SELECT t.table_schema as schema,
             t.table_name as name,
             t.table_type as type
      FROM information_schema.tables t
      WHERE t.table_schema NOT IN ('pg_catalog','information_schema')
      ORDER BY t.table_schema, t.table_name
    `)

    // Row count estimate and relkind
    const statsRes = await dbPool.query(poolConfig, `
      SELECT n.nspname as schema,
             c.relname as name,
             c.relkind,
             GREATEST(c.reltuples::bigint, 0) as row_estimate
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname NOT IN ('pg_catalog','information_schema')
        AND c.relkind IN ('r','v','m','p')
    `)

    const statsKey = new Map<string, { row_estimate: number; relkind: string }>()
    for (const r of statsRes.rows as Array<{ schema: string; name: string; row_estimate: number; relkind: string }>) {
      statsKey.set(`${r.schema}.${r.name}`, { row_estimate: Number(r.row_estimate || 0), relkind: r.relkind })
    }

    const schemasOut = schemas.map(schemaName => ({
      name: schemaName,
      tables: [] as Array<{ name: string; type: 'table' | 'view' | 'materialized_view'; schema: string; rowCount?: number }>,
    }))

    const schemaIndex = new Map<string, number>()
    schemasOut.forEach((s, idx) => schemaIndex.set(s.name, idx))

    for (const t of tablesRes.rows as Array<{ schema: string; name: string; type: string }>) {
      const idx = schemaIndex.get(t.schema)
      if (idx === undefined) continue
      const stat = statsKey.get(`${t.schema}.${t.name}`)
      let mappedType: 'table' | 'view' | 'materialized_view' = 'table'
      // Prefer relkind mapping if available; fallback to information_schema type
      if (stat) {
        if (stat.relkind === 'v') mappedType = 'view'
        else if (stat.relkind === 'm') mappedType = 'materialized_view'
        else mappedType = 'table'
      } else {
        mappedType = t.type.toLowerCase().includes('view') ? 'view' : 'table'
      }
      schemasOut[idx].tables.push({
        name: t.name,
        type: mappedType,
        schema: t.schema,
        rowCount: stat?.row_estimate,
      })
    }

    const databaseInfo = {
      name: database,
      schemas: schemasOut,
    }

    return NextResponse.json([databaseInfo])
  } catch (error: any) {
    console.error('schema/tree API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load schema tree' }, { status: 500 })
  }
}



