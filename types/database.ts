export interface DatabaseInfo {
  name: string
  schemas: SchemaInfo[]
}

export interface SchemaInfo {
  name: string
  tables: TableInfo[]
}

export interface TableInfo {
  name: string
  type: "table" | "view" | "materialized_view"
  schema: string
  rowCount?: number
  columnCount?: number
  size?: string
  createdAt?: Date
}

export interface ColumnInfo {
  name: string
  dataType: string
  isNullable: boolean
  defaultValue?: string
  isPrimaryKey?: boolean
}

export interface TableData {
  columns: ColumnInfo[]
  rows: Record<string, any>[]
  totalRows: number
  currentPage: number
  pageSize: number
}

export interface SelectedTable {
  serverId: string
  serverName: string
  database: string
  schema: string
  table: string
  type: "table" | "view" | "materialized_view"
}
