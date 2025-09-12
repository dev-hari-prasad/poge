export interface DatabaseObject {
  id: string
  name: string
  type: "database" | "schema" | "table" | "view" | "index" | "constraint" | "column"
  parent?: string
  serverId: string
  database?: string
  schema?: string
  metadata?: Record<string, any>
}

export interface ColumnDefinition {
  name: string
  dataType: string
  length?: number
  precision?: number
  scale?: number
  isNullable: boolean
  defaultValue?: string
  isPrimaryKey: boolean
  isUnique: boolean
  isAutoIncrement: boolean
  comment?: string
}

export interface IndexDefinition {
  name: string
  columns: string[]
  isUnique: boolean
  type: "btree" | "hash" | "gin" | "gist"
  condition?: string
}

export interface ConstraintDefinition {
  name: string
  type: "primary_key" | "foreign_key" | "unique" | "check"
  columns: string[]
  referencedTable?: string
  referencedColumns?: string[]
  onUpdate?: "cascade" | "restrict" | "set_null" | "set_default"
  onDelete?: "cascade" | "restrict" | "set_null" | "set_default"
  checkExpression?: string
}

export interface TableDefinition {
  name: string
  schema: string
  columns: ColumnDefinition[]
  indexes: IndexDefinition[]
  constraints: ConstraintDefinition[]
  comment?: string
}

export interface ViewDefinition {
  name: string
  schema: string
  definition: string
  comment?: string
}

export interface DatabaseDefinition {
  name: string
  encoding: string
  collation: string
  template?: string
  owner?: string
  comment?: string
}

export interface SchemaDefinition {
  name: string
  database: string
  owner?: string
  comment?: string
}

export interface SchemaOperation {
  type: "create" | "alter" | "drop"
  objectType: "database" | "schema" | "table" | "view" | "index" | "constraint"
  sql: string
  description: string
}

export interface BackupOptions {
  includeData: boolean
  includeSchema: boolean
  format: "sql" | "custom" | "tar"
  compression: boolean
  tables?: string[]
}
