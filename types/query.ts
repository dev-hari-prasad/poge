export interface QueryTab {
  id: string
  name: string
  content: string
  isModified: boolean
  locked: boolean
  serverId?: string
  database?: string
}

export interface SavedQuery {
  id: string
  name: string
  content: string
  createdAt: Date
  lastModified: Date
  category?: "select" | "insert" | "update" | "delete"
}

export interface QueryResult {
  type: "select" | "insert" | "update" | "delete" | "error" | "success"
  columns?: string[]
  rows?: Record<string, any>[]
  rowCount?: number
  affectedRows?: number
  executionTime: number
  error?: string
  query: string
  fromCache?: boolean
  cacheHits?: number
  isStale?: boolean
  cacheAge?: number
  tableNames?: string[]
  statement?: string
}

export interface QueryExecution {
  id: string
  query: string
  results: QueryResult[]
  executionTime: number
  timestamp: Date
  serverId: string
  database: string
}

export interface QueryTemplate {
  id: string
  name: string
  description: string
  content: string
  category: "select" | "insert" | "update" | "delete" | "ddl" | "utility"
}
