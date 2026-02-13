const DESTRUCTIVE_PATTERNS = [
  { pattern: /^\s*DROP\s+(TABLE|DATABASE|SCHEMA|VIEW|INDEX|TRIGGER|FUNCTION|PROCEDURE)/i, action: 'DROP' },
  { pattern: /^\s*DELETE\s+FROM/i, action: 'DELETE' },
  { pattern: /^\s*TRUNCATE\s+TABLE/i, action: 'TRUNCATE' },
  { pattern: /^\s*ALTER\s+TABLE\s+\w+\s+DROP\s+(COLUMN|CONSTRAINT)/i, action: 'ALTER' },
]

const OBJECT_TYPES: Record<string, string> = {
  TABLE: 'table',
  DATABASE: 'database',
  SCHEMA: 'schema',
  VIEW: 'view',
  INDEX: 'index',
  COLUMN: 'column',
  CONSTRAINT: 'constraint',
}

interface DestructiveQueryInfo {
  isDestructive: boolean
  action?: string
  objectType?: string
  message?: string
}

export function detectDestructiveQuery(sql: string): DestructiveQueryInfo {
  if (!sql || !sql.trim()) return { isDestructive: false }

  const trimmedSql = sql.trim()
  
  for (const { pattern, action } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(trimmedSql)) {
      let objectType = ''
      const objectMatch = trimmedSql.match(pattern)
      if (objectMatch && objectMatch[1]) {
        objectType = OBJECT_TYPES[objectMatch[1].toUpperCase()] || objectMatch[1].toLowerCase()
      }

      let message = `Confirm ${action} operation`
      if (objectType) {
        message = `Confirm ${action} ${objectType}`
      }

      return {
        isDestructive: true,
        action,
        objectType,
        message,
      }
    }
  }

  return { isDestructive: false }
}

export function getDestructiveActionMessage(action: string, objectType?: string): string {
  const messages: Record<string, string> = {
    DROP: `This will permanently delete the ${objectType || 'object'}. This action cannot be undone.`,
    DELETE: 'This will permanently delete rows from the table. This action cannot be undone.',
    TRUNCATE: 'This will delete all rows from the table. This action cannot be undone.',
    ALTER: `This will modify the table structure. This action cannot be undone.`,
  }
  return messages[action] || 'This is a destructive operation. This action cannot be undone.'
}
