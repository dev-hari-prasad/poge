import { NextRequest, NextResponse } from 'next/server'
import { dbPool, type PoolKey } from '@/lib/db-pool'
import { QueryParser, type ParsedStatement } from '@/lib/query-parser'

interface QueryExecutionResult {
  rows?: any[]
  fields?: any[]
  rowCount?: number
  command?: string
  executionTime: number
  statement: string
  error?: string
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { host, port, user, password, database, sql, sslMode } = await req.json()
    
    if (!host || !port || !user || !database || !sql) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const poolConfig: PoolKey = {
      host,
      port,
      user,
      password,
      database,
      ssl: sslMode === "require"
    }

    // Parse the query into individual statements
    const statements = QueryParser.parseQuery(sql)
    
    if (statements.length === 0) {
      return NextResponse.json({ error: 'No valid SQL statements found' }, { status: 400 })
    }

    // Execute statements
    const results: QueryExecutionResult[] = []
    
    if (statements.length === 1) {
      // Single statement - direct execution
      const statement = statements[0]
      const result = await executeSingleStatement(poolConfig, statement, startTime)
      
      // Check if there's an error in the result
      if (result.error) {
        return NextResponse.json(result, { status: 500 })
      }
      
      return NextResponse.json(result)
    } else {
      // Multiple statements
      if (QueryParser.canExecuteConcurrently(statements)) {
        // All read-only - execute concurrently
        const promises = statements.map(stmt => 
          executeSingleStatement(poolConfig, stmt, Date.now())
        )
        const concurrentResults = await Promise.all(promises)
        
        // Check if any result has an error
        const hasError = concurrentResults.some(result => result.error)
        if (hasError) {
          return NextResponse.json({ 
            multipleResults: true,
            results: concurrentResults,
            totalExecutionTime: Date.now() - startTime,
            error: "One or more statements failed"
          }, { status: 500 })
        }
        
        return NextResponse.json({ 
          multipleResults: true,
          results: concurrentResults,
          totalExecutionTime: Date.now() - startTime
        })
      } else if (QueryParser.shouldUseTransaction(statements)) {
        // Write operations - use transaction
        const transactionResult = await executeInTransaction(poolConfig, statements, startTime)
        
        // Check for errors in transaction result
        if (transactionResult.error) {
          return NextResponse.json(transactionResult, { status: 500 })
        }
        
        return NextResponse.json(transactionResult)
      } else {
        // Mixed operations - execute sequentially
        for (const statement of statements) {
          const result = await executeSingleStatement(poolConfig, statement, Date.now())
          results.push(result)
        }
        
        // Check if any result has an error
        const hasError = results.some(result => result.error)
        if (hasError) {
          return NextResponse.json({ 
            multipleResults: true,
            results,
            totalExecutionTime: Date.now() - startTime,
            error: "One or more statements failed"
          }, { status: 500 })
        }
        
        return NextResponse.json({ 
          multipleResults: true,
          results,
          totalExecutionTime: Date.now() - startTime
        })
      }
    }
  } catch (error: any) {
    console.error('Query execution error:', error)
    return NextResponse.json({ 
      error: {
        message: error.message,
        code: error.code,
        severity: error.severity,
        routine: error.routine,
        executionTime: Date.now() - startTime
      }
    }, { status: 500 })
  }
}

async function executeSingleStatement(
  poolConfig: PoolKey,
  statement: ParsedStatement,
  startTime: number
): Promise<QueryExecutionResult> {
  try {
    // Optimize the query
    const optimizedSql = QueryParser.optimizeQuery(statement.sql)

    const result = await dbPool.query(poolConfig, optimizedSql)
    const executionTime = Date.now() - startTime
    
    const queryResult = {
      rows: result.rows,
      fields: result.fields,
      rowCount: result.rowCount,
      command: result.command,
      executionTime,
      statement: statement.sql
    }

    return queryResult
  } catch (error: any) {
    return {
      error: error.message,
      executionTime: Date.now() - startTime,
      statement: statement.sql
    }
  }
}

async function executeInTransaction(
  poolConfig: PoolKey, 
  statements: ParsedStatement[], 
  startTime: number
): Promise<any> {
  return await dbPool.queryWithClient(poolConfig, async (client) => {
    try {
      await client.query('BEGIN')
      
      const results: QueryExecutionResult[] = []
      
      for (const statement of statements) {
        const stmtStartTime = Date.now()
        try {
          const optimizedSql = QueryParser.optimizeQuery(statement.sql)
          const result = await client.query(optimizedSql)
          
          results.push({
            rows: result.rows,
            fields: result.fields,
            rowCount: result.rowCount,
            command: result.command,
            executionTime: Date.now() - stmtStartTime,
            statement: statement.sql
          })
        } catch (error: any) {
          await client.query('ROLLBACK')
          throw new Error(`Transaction failed at statement: ${statement.sql.substring(0, 100)}... Error: ${error.message}`)
        }
      }
      
      await client.query('COMMIT')
      
      return {
        multipleResults: true,
        transactionUsed: true,
        results,
        totalExecutionTime: Date.now() - startTime
      }
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    }
  })
}