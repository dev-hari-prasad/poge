export interface ParsedStatement {
  sql: string
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP' | 'EXPLAIN' | 'ANALYZE' | 'WITH' | 'UNKNOWN'
  isReadOnly: boolean
  estimatedComplexity: 'low' | 'medium' | 'high'
  hasSubqueries: boolean
  tables: string[]
  params?: string[]
}

export class QueryParser {
  private static readonly STATEMENT_SEPARATORS = /;\s*(?=(?:[^']*'[^']*')*[^']*$)/g
  private static readonly COMMENT_PATTERNS = [
    /--.*$/gm,  // Single line comments
    /\/\*[\s\S]*?\*\//g  // Multi-line comments
  ]

  static parseQuery(query: string): ParsedStatement[] {
    // Remove comments
    let cleanQuery = query
    for (const pattern of this.COMMENT_PATTERNS) {
      cleanQuery = cleanQuery.replace(pattern, ' ')
    }

    // Split into statements
    const statements = cleanQuery
      .split(this.STATEMENT_SEPARATORS)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    return statements.map(sql => this.parseStatement(sql))
  }

  private static parseStatement(sql: string): ParsedStatement {
    const normalizedSql = sql.trim().toUpperCase()
    const originalSql = sql.trim()

    // Detect statement type
    const type = this.detectStatementType(normalizedSql)
    const isReadOnly = this.isReadOnlyStatement(type, normalizedSql)
    const hasSubqueries = this.hasSubqueries(normalizedSql)
    const tables = this.extractTables(normalizedSql, type)
    const estimatedComplexity = this.estimateComplexity(normalizedSql, hasSubqueries, tables.length)

    return {
      sql: originalSql,
      type,
      isReadOnly,
      estimatedComplexity,
      hasSubqueries,
      tables
    }
  }

  private static detectStatementType(sql: string): ParsedStatement['type'] {
    const firstWord = sql.split(/\s+/)[0]
    
    switch (firstWord) {
      case 'SELECT':
      case 'WITH': // CTE queries
        return sql.includes('SELECT') ? 'SELECT' : 'WITH'
      case 'INSERT':
        return 'INSERT'
      case 'UPDATE':
        return 'UPDATE'
      case 'DELETE':
        return 'DELETE'
      case 'CREATE':
        return 'CREATE'
      case 'ALTER':
        return 'ALTER'
      case 'DROP':
        return 'DROP'
      case 'EXPLAIN':
        return 'EXPLAIN'
      case 'ANALYZE':
        return 'ANALYZE'
      default:
        return 'UNKNOWN'
    }
  }

  private static isReadOnlyStatement(type: ParsedStatement['type'], sql: string): boolean {
    const readOnlyTypes = ['SELECT', 'EXPLAIN', 'ANALYZE']
    if (readOnlyTypes.includes(type)) return true

    // Check for SELECT in WITH statements
    if (type === 'WITH' && !sql.includes('INSERT') && !sql.includes('UPDATE') && !sql.includes('DELETE')) {
      return true
    }

    return false
  }

  private static hasSubqueries(sql: string): boolean {
    // Simple heuristic: look for SELECT keywords beyond the first one
    const selectMatches = sql.match(/SELECT/g)
    return (selectMatches?.length || 0) > 1
  }

  private static extractTables(sql: string, type: ParsedStatement['type']): string[] {
    const tables: string[] = []
    
    try {
      switch (type) {
        case 'SELECT':
        case 'WITH':
          this.extractTablesFromSelect(sql, tables)
          break
        case 'INSERT':
          this.extractTablesFromInsert(sql, tables)
          break
        case 'UPDATE':
          this.extractTablesFromUpdate(sql, tables)
          break
        case 'DELETE':
          this.extractTablesFromDelete(sql, tables)
          break
      }
    } catch (error) {
      // If parsing fails, return empty array - better than crashing
      console.warn('Failed to extract tables from query:', error)
    }

    return [...new Set(tables)] // Remove duplicates
  }

  private static extractTablesFromSelect(sql: string, tables: string[]): void {
    // Match FROM clause
    const fromMatch = sql.match(/FROM\s+([^WHERE|GROUP|ORDER|LIMIT|HAVING|;]+)/i)
    if (fromMatch) {
      this.parseTableNames(fromMatch[1], tables)
    }

    // Match JOIN clauses
    const joinMatches = sql.matchAll(/JOIN\s+([^\s]+)/gi)
    for (const match of joinMatches) {
      this.parseTableNames(match[1], tables)
    }
  }

  private static extractTablesFromInsert(sql: string, tables: string[]): void {
    const match = sql.match(/INSERT\s+INTO\s+([^\s(]+)/i)
    if (match) {
      this.parseTableNames(match[1], tables)
    }
  }

  private static extractTablesFromUpdate(sql: string, tables: string[]): void {
    const match = sql.match(/UPDATE\s+([^\s]+)/i)
    if (match) {
      this.parseTableNames(match[1], tables)
    }
  }

  private static extractTablesFromDelete(sql: string, tables: string[]): void {
    const match = sql.match(/DELETE\s+FROM\s+([^\s]+)/i)
    if (match) {
      this.parseTableNames(match[1], tables)
    }
  }

  private static parseTableNames(tableString: string, tables: string[]): void {
    // Remove common SQL keywords and split by commas
    const cleaned = tableString
      .replace(/\b(AS|ON|WHERE|GROUP|ORDER|LIMIT|HAVING)\b.*/i, '')
      .trim()

    const tableNames = cleaned.split(',').map(name => {
      // Remove schema prefix and aliases
      return name.trim()
        .replace(/^\w+\./, '') // Remove schema prefix
        .replace(/\s+(AS\s+)?\w+$/i, '') // Remove alias
        .replace(/["`]/g, '') // Remove quotes
        .trim()
    }).filter(name => name.length > 0 && !name.includes('('))

    tables.push(...tableNames)
  }

  private static estimateComplexity(sql: string, hasSubqueries: boolean, tableCount: number): ParsedStatement['estimatedComplexity'] {
    let score = 0

    // Base complexity from table count
    score += tableCount

    // Subqueries add complexity
    if (hasSubqueries) score += 2

    // Complex operations
    if (sql.includes('GROUP BY')) score += 1
    if (sql.includes('ORDER BY')) score += 1
    if (sql.includes('DISTINCT')) score += 1
    if (sql.includes('UNION')) score += 2
    if (sql.includes('INTERSECT') || sql.includes('EXCEPT')) score += 2
    if (sql.includes('WINDOW') || sql.includes('OVER')) score += 2
    
    // Aggregation functions
    const aggregateFunctions = ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'ARRAY_AGG']
    for (const fn of aggregateFunctions) {
      if (sql.includes(fn + '(')) score += 0.5
    }

    // JOIN complexity
    const joinCount = (sql.match(/JOIN/g) || []).length
    score += joinCount * 0.5

    if (score <= 2) return 'low'
    if (score <= 5) return 'medium'
    return 'high'
  }

  static canExecuteConcurrently(statements: ParsedStatement[]): boolean {
    // Only read-only statements can be executed concurrently safely
    return statements.every(stmt => stmt.isReadOnly)
  }

  static shouldUseTransaction(statements: ParsedStatement[]): boolean {
    // Use transaction for multiple write operations
    const writeStatements = statements.filter(stmt => !stmt.isReadOnly)
    return writeStatements.length > 1
  }

  static optimizeQuery(sql: string): string {
    let optimized = sql

    // Remove extra whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim()

    // Add LIMIT if SELECT without it (safety measure)
    if (optimized.toUpperCase().startsWith('SELECT') && 
        !optimized.toUpperCase().includes('LIMIT') && 
        !optimized.toUpperCase().includes('COUNT(')) {
      // Only add LIMIT for simple SELECT statements without aggregation
      if (!optimized.toUpperCase().includes('GROUP BY') && 
          !optimized.toUpperCase().includes('DISTINCT')) {
        optimized += ' LIMIT 1000'
      }
    }

    return optimized
  }
}