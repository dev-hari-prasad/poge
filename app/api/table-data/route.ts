import { NextRequest, NextResponse } from 'next/server'
import { dbPool, type PoolKey } from '@/lib/db-pool'

type SortDirection = 'asc' | 'desc'

function quoteIdentifier(identifier: string): string {
  // Basic identifier validation and quoting to prevent injection
  // Allows letters, numbers, underscore, and $; rejects others
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`)
  }
  return '"' + identifier.replace(/"/g, '""') + '"'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      host,
      port,
      user,
      password,
      database,
      sslMode,
      schema,
      table,
      page = 1,
      pageSize = 50,
      sortColumn,
      sortDirection = 'asc',
    } = body ?? {}

    if (!host || !port || !user || !database || !schema || !table) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const poolConfig: PoolKey = {
      host,
      port,
      user,
      password,
      database,
      ssl: sslMode === 'require'
    }

    // Fetch column metadata (including primary key info)
    const columnsSql = `
      SELECT c.column_name,
             c.data_type,
             c.is_nullable,
             c.column_default,
             (tc.constraint_type = 'PRIMARY KEY') AS is_primary_key
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu
        ON c.table_schema = kcu.table_schema
       AND c.table_name = kcu.table_name
       AND c.column_name = kcu.column_name
      LEFT JOIN information_schema.table_constraints tc
        ON kcu.table_schema = tc.table_schema
       AND kcu.table_name = tc.table_name
       AND kcu.constraint_name = tc.constraint_name
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position
    `

    const columnsResult = await dbPool.query(poolConfig, columnsSql, [schema, table])

    if (columnsResult.rowCount === 0) {
      return NextResponse.json({ error: 'Table has no columns or does not exist' }, { status: 404 })
    }

    const columns = columnsResult.rows.map((r: any) => ({
      name: r.column_name as string,
      dataType: r.data_type as string,
      isNullable: r.is_nullable === 'YES',
      defaultValue: r.column_default ?? undefined,
      isPrimaryKey: Boolean(r.is_primary_key),
    })) as Array<{
      name: string
      dataType: string
      isNullable: boolean
      defaultValue?: string
      isPrimaryKey?: boolean
    }>

    // Validate sort column if provided
    let orderByClause = ''
    if (sortColumn) {
      const allowed = columns.some((c) => c.name === sortColumn)
      if (allowed) {
        const safeDirection: SortDirection = String(sortDirection).toLowerCase() === 'desc' ? 'desc' : 'asc'
        orderByClause = ` ORDER BY ${quoteIdentifier(sortColumn)} ${safeDirection.toUpperCase()}`
      }
    }

    // Count total rows
    const countSql = `SELECT COUNT(*)::bigint AS cnt FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table)}`
    const countResult = await dbPool.query(poolConfig, countSql)
    const totalRows = Number(countResult.rows?.[0]?.cnt ?? 0)

    // Page and offset
    const limit = Math.max(1, Math.min(1000, Number(pageSize) || 50))
    const pageNum = Math.max(1, Number(page) || 1)
    const offset = (pageNum - 1) * limit

    // Build data query
    const dataSql = `SELECT * FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table)}${orderByClause} LIMIT $1 OFFSET $2`
    const dataResult = await dbPool.query(poolConfig, dataSql, [limit, offset])

    return NextResponse.json({
      columns,
      rows: dataResult.rows,
      totalRows,
      currentPage: pageNum,
      pageSize: limit,
    })
  } catch (error: any) {
    console.error('table-data API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to load table data' }, { status: 500 })
  }
}


