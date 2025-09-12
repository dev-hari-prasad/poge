"use client"

import React, { useEffect, useRef, useState } from "react"
import hljs from "highlight.js"
import sql from "highlight.js/lib/languages/sql"
import "@/styles/sql-editor.css"
import { cn } from "@/lib/utils"

// Register SQL language with enhanced configuration
hljs.registerLanguage('sql', sql)

// Configure highlight.js for better SQL support
hljs.configure({
  ignoreUnescapedHTML: true,
  throwUnescapedHTML: false
})

// (Removed invalid top-level useEffect test block)

interface SQLEditorProps {
  value: string
  onChange: (value: string) => void
  onSelect?: () => void
  onMouseUp?: () => void
  onKeyUp?: () => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}

export function SQLEditor({
  value,
  onChange,
  onSelect,
  onMouseUp,
  onKeyUp,
  placeholder = "-- Write your SQL query here",
  className,
  style
}: SQLEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  // Highlight the code whenever value changes
  useEffect(() => {
    if (highlightRef.current) {
      try {
        // Use more comprehensive SQL highlighting with better keyword detection
        const highlighted = hljs.highlight(value || placeholder, { 
          language: 'sql',
          ignoreIllegals: true
        })
        
        // Post-process the highlighted HTML to ensure SQL keywords are properly styled
        let processedHtml = highlighted.value
        
        // Ensure common SQL keywords are highlighted (fallback for any missed ones)
        const sqlKeywords = [
          'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
          'TABLE', 'INDEX', 'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'SCHEMA', 'DATABASE',
          'LIMIT', 'OFFSET', 'ORDER', 'BY', 'GROUP', 'HAVING', 'JOIN', 'LEFT', 'RIGHT', 'INNER',
          'OUTER', 'ON', 'AS', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE', 'IS', 'NULL', 'NOT',
          'AND', 'OR', 'XOR', 'UNION', 'INTERSECT', 'EXCEPT', 'DISTINCT', 'ALL', 'ANY', 'SOME',
          'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'CONVERT', 'COALESCE', 'NULLIF',
          'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'STDDEV', 'VARIANCE', 'FIRST', 'LAST'
        ]
        
        // Add highlighting classes to any missed keywords
        sqlKeywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
          processedHtml = processedHtml.replace(regex, `<span class="hljs-keyword">${keyword}</span>`)
        })
        
        // Also ensure strings, numbers, and comments are properly highlighted
        const stringRegex = /'[^']*'/g
        processedHtml = processedHtml.replace(stringRegex, (match) => `<span class="hljs-string">${match}</span>`)
        
        const numberRegex = /\b\d+(?:\.\d+)?\b/g
        processedHtml = processedHtml.replace(numberRegex, (match) => `<span class="hljs-number">${match}</span>`)
        
        const commentRegex = /--.*$/gm
        processedHtml = processedHtml.replace(commentRegex, (match) => `<span class="hljs-comment">${match}</span>`)
        
        highlightRef.current.innerHTML = processedHtml
        
        // Debug: log what was highlighted
        if (process.env.NODE_ENV === 'development') {
          console.log('Highlighted SQL:', processedHtml)
        }
      } catch (error) {
        console.error('SQL highlighting error:', error)
        // Fallback to plain text if highlighting fails
        highlightRef.current.innerHTML = value || placeholder
      }
    }
  }, [value, placeholder])

  // Sync scroll between textarea and highlight
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }

  // Handle textarea changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  // Handle textarea selection
  const handleSelect = () => {
    onSelect?.()
  }

  // Handle textarea mouse up
  const handleMouseUp = () => {
    onMouseUp?.()
  }

  // Handle textarea key up
  const handleKeyUp = () => {
    onKeyUp?.()
  }

  // Handle auto-closing brackets and quotes
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentValue = value

    // Auto-closing pairs
    const autoClosePairs: Record<string, string> = {
      "'": "'",
      '"': '"',
      '(': ')',
      '<': '>',
      '[': ']',
      '{': '}'
    }

    const char = e.key
    const closingChar = autoClosePairs[char]

    if (closingChar && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault()
      
      const beforeCursor = currentValue.substring(0, start)
      const afterCursor = currentValue.substring(end)
      
      // Insert both opening and closing characters
      const newValue = beforeCursor + char + closingChar + afterCursor
      onChange(newValue)
      
      // Set cursor position between the opening and closing characters
      setTimeout(() => {
        textarea.setSelectionRange(start + 1, start + 1)
      }, 0)
    }
  }

  return (
    <div className={cn("relative sql-editor", className)} style={style}>
      {/* Highlighted background */}
      <pre
        ref={highlightRef}
        className="absolute inset-0 m-0 p-0 overflow-auto font-mono text-sm bg-transparent border-0 rounded-none focus:outline-none hljs"
        style={{
          paddingLeft: "8px",
          paddingRight: "8px",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          pointerEvents: "none",
          zIndex: 1,
          lineHeight: "24px",
        }}
      />
      
      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onMouseUp={handleMouseUp}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onScroll={handleScroll}
        className={cn(
          "absolute inset-0 resize-none border-0 rounded-none font-mono text-sm",
          "focus-visible:ring-0 focus-visible:ring-green-500 focus-visible:ring-offset-0 focus-visible:outline-none",
          "transition-colors bg-transparent text-transparent caret-foreground",
          isFocused && "bg-muted/10"
        )}
        placeholder={placeholder}
        style={{
          paddingLeft: "8px",
          paddingRight: "8px",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          zIndex: 2,
          lineHeight: "24px",
        }}
      />
    </div>
  )
} 