"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Plus, Save, Trash2, Edit3, FileText, Search, Grid3X3, List, ChevronDown, ChevronUp, Eye, Bold, Italic, Underline, Code, Pin, PinOff, Upload, Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogDescription, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useNotesStorage, type Note } from "@/hooks/use-notes-storage"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

export function Notes() {
  const { notes, addNote, updateNote, deleteNote, togglePinned, exportNotes, importNotes } = useNotesStorage()
  const { toast } = useToast()
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showNewNoteDialog, setShowNewNoteDialog] = useState(false)
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newNoteTitle, setNewNoteTitle] = useState("")
  const [editingTitle, setEditingTitle] = useState("")
  const [editingContent, setEditingContent] = useState("")
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards")
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null)
  const [showLivePreview, setShowLivePreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingAction, setPendingAction] = useState<null | { type: "close-dialog" | "switch-note" | "cancel-edit"; payload?: any }>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const filteredNotes = useMemo(() => (
    notes.filter(
      (note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ), [notes, searchQuery])

  const isDirty = useMemo(() => {
    if (!selectedNote) return false
    return (
      editingTitle.trim() !== (selectedNote.title ?? "").trim() ||
      (editingContent ?? "") !== (selectedNote.content ?? "")
    )
  }, [selectedNote, editingTitle, editingContent])

  const handleCreateNote = () => {
    if (newNoteTitle.trim()) {
      const newNote = addNote(newNoteTitle.trim())
      setSelectedNote(newNote)
      setIsEditing(true)
      setEditingTitle(newNote.title)
      setEditingContent(newNote.content)
      setNewNoteTitle("")
      setShowNewNoteDialog(false)
      setShowNoteDialog(true)
      toast({ title: "Note created" })
    }
  }

  // Autosave when editing stops for a short duration
  useEffect(() => {
    if (!isEditing || !selectedNote) return
    setIsSaving(true)
    const handle = setTimeout(() => {
      if (editingTitle.trim()) {
        updateNote(selectedNote.id, editingTitle.trim(), editingContent)
        setIsSaving(false)
      } else {
        setIsSaving(false)
      }
    }, 700)
    return () => clearTimeout(handle)
  }, [editingTitle, editingContent, isEditing, selectedNote, updateNote])

  // Keyboard shortcuts for editor
  useEffect(() => {
    if (!showNoteDialog) return
    const onKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.ctrlKey || e.metaKey
      if (isMeta && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSaveNote()
      }
      if (!isEditing) return
      if (isMeta && e.key.toLowerCase() === 'b') {
        e.preventDefault(); applyFormatting('bold')
      }
      if (isMeta && e.key.toLowerCase() === 'i') {
        e.preventDefault(); applyFormatting('italic')
      }
      if (isMeta && e.key.toLowerCase() === 'u') {
        e.preventDefault(); applyFormatting('underline')
      }
      if (isMeta && e.key === '`') {
        e.preventDefault(); applyFormatting('code')
      }
      if (e.key === 'Escape' && isEditing) {
        e.preventDefault(); handleCancelEdit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showNoteDialog, isEditing, editingTitle, editingContent])

  const requestCloseDialog = (open: boolean) => {
    if (open) {
      setShowNoteDialog(true)
      return
    }
    if (isDirty) {
      setPendingAction({ type: "close-dialog" })
      setShowUnsavedDialog(true)
      return
    }
    setShowNoteDialog(false)
  }

  const executePendingAction = (action: typeof pendingAction) => {
    if (!action) return
    if (action.type === "close-dialog") {
      setShowNoteDialog(false)
      setIsEditing(false)
    } else if (action.type === "switch-note") {
      const { note, editing } = action.payload
      actuallyOpenNote(note, editing)
    } else if (action.type === "cancel-edit") {
      if (selectedNote) {
        setEditingTitle(selectedNote.title)
        setEditingContent(selectedNote.content || '')
      }
      setIsEditing(false)
    }
    setPendingAction(null)
  }

  const handleExport = () => {
    const data = exportNotes()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notes-${new Date().toISOString().slice(0,19)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File) => {
    const text = await file.text()
    importNotes(text)
    toast({ title: "Notes imported" })
  }

  const actuallyOpenNote = (note: Note, editing = false) => {
    setSelectedNote(note)
    setEditingTitle(note.title)
    setEditingContent(note.content || '')
    setIsEditing(editing)
    setShowNoteDialog(true)
  }

  const handleOpenNote = (note: Note, editing = false) => {
    if (showNoteDialog && (editingTitle.trim() !== (selectedNote?.title ?? '').trim() || (editingContent ?? '') !== (selectedNote?.content ?? ''))) {
      setPendingAction({ type: "switch-note", payload: { note, editing } })
      setShowUnsavedDialog(true)
      return
    }
    actuallyOpenNote(note, editing)
  }

  const handleSaveNote = () => {
    if (selectedNote && editingTitle.trim()) {
      updateNote(selectedNote.id, editingTitle.trim(), editingContent)
      setSelectedNote({
        ...selectedNote,
        title: editingTitle.trim(),
        content: editingContent,
        lastModified: new Date(),
      })
      setIsEditing(false)
      setIsSaving(false)
      toast({ title: "Note saved" })
    }
  }

  const handleCancelEdit = () => {
    if ((editingTitle.trim() !== (selectedNote?.title ?? '').trim()) || ((editingContent ?? '') !== (selectedNote?.content ?? ''))) {
      setPendingAction({ type: "cancel-edit" })
      setShowUnsavedDialog(true)
      return
    }
    if (selectedNote) {
      setEditingTitle(selectedNote.title)
      setEditingContent(selectedNote.content || '')
    }
    setIsEditing(false)
  }

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId)
    if (selectedNote?.id === noteId) {
      setSelectedNote(null)
      setIsEditing(false)
      setShowNoteDialog(false)
    }
    toast({ title: "Note deleted" })
  }

  const toggleNoteExpansion = (noteId: string) => {
    const newExpanded = new Set(expandedNotes)
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId)
    } else {
      newExpanded.add(noteId)
    }
    setExpandedNotes(newExpanded)
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const applyFormatting = (format: 'bold' | 'italic' | 'underline' | 'code') => {
    if (!textareaRef) return

    const start = textareaRef.selectionStart
    const end = textareaRef.selectionEnd
    const selectedText = editingContent.substring(start, end)
    
    let formattedText = ""
    let prefixLength = 0
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`
        prefixLength = 2
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        prefixLength = 1
        break
      case 'underline':
        formattedText = `<u>${selectedText}</u>`
        prefixLength = 3
        break
      case 'code':
        if (selectedText.includes('\n')) {
          formattedText = `\`\`\`\n${selectedText}\n\`\`\``
          prefixLength = 4
        } else {
          formattedText = `\`${selectedText}\``
          prefixLength = 1
        }
        break
    }
    
    const newContent = editingContent.substring(0, start) + formattedText + editingContent.substring(end)
    setEditingContent(newContent)
    
    // Set cursor position after formatting
    setTimeout(() => {
      if (textareaRef) {
        if (selectedText) {
          textareaRef.setSelectionRange(start + prefixLength, start + prefixLength + selectedText.length)
        } else {
          textareaRef.setSelectionRange(start + prefixLength, start + prefixLength)
        }
        textareaRef.focus()
      }
    }, 0)
  }

  const stripHtmlForPreview = (html: string, maxLength: number = 150) => {
    if (!html) return "No content"
    
    // Create a temporary div to strip HTML tags
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    const textContent = tempDiv.textContent || tempDiv.innerText || ""
    
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + "..."
      : textContent
  }



  const renderFormattedContent = (content: string) => {
    if (!content) return <span className="text-muted-foreground italic">No content</span>

    // Split content by lines to handle code blocks properly
    const lines = content.split('\n')
    const result: React.ReactNode[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Handle code blocks
      if (line.trim() === '```') {
        if (inCodeBlock) {
          // End of code block
          result.push(
            <pre key={`code-${i}`} className="bg-muted p-2 rounded text-sm font-mono my-2 overflow-x-auto">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          )
          codeBlockContent = []
          inCodeBlock = false
        } else {
          // Start of code block
          inCodeBlock = true
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }

      // Process inline formatting
      let processedLine = line
      const parts: React.ReactNode[] = []
      let lastIndex = 0

      // Find all formatting patterns
      const patterns = [
        { regex: /\*\*(.*?)\*\*/g, component: (text: string, key: number) => <strong key={key}>{text}</strong> },
        { regex: /\*(.*?)\*/g, component: (text: string, key: number) => <em key={key}>{text}</em> },
        { regex: /<u>(.*?)<\/u>/g, component: (text: string, key: number) => <u key={key}>{text}</u> },
        { regex: /`(.*?)`/g, component: (text: string, key: number) => <code key={key} className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{text}</code> }
      ]

      // Collect all matches with their positions
      const allMatches: Array<{ start: number; end: number; replacement: React.ReactNode }> = []
      
      patterns.forEach(pattern => {
        let match
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
        while ((match = regex.exec(processedLine)) !== null) {
          allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: pattern.component(match[1], allMatches.length)
          })
        }
      })

      // Sort matches by position
      allMatches.sort((a, b) => a.start - b.start)

      // Build the line with formatting
      let currentIndex = 0
      allMatches.forEach((match, index) => {
        // Add text before this match
        if (match.start > currentIndex) {
          parts.push(processedLine.substring(currentIndex, match.start))
        }
        // Add the formatted component
        parts.push(match.replacement)
        currentIndex = match.end
      })

      // Add remaining text
      if (currentIndex < processedLine.length) {
        parts.push(processedLine.substring(currentIndex))
      }

      // If no formatting found, just add the line
      if (parts.length === 0) {
        parts.push(processedLine)
      }

      result.push(
        <div key={i}>
          {parts}
          {i < lines.length - 1 && <br />}
        </div>
      )
    }

    return <>{result}</>
  }

  return (
    <>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between bg-background border-b px-4">
          <div className="flex items-center gap-2">
           
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Removed overflow menu per request; keep import/export accessible via keyboard shortcuts later if needed */}
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
              if (e.target) (e.target as HTMLInputElement).value = ""
            }} />
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "cards" | "list")}>
              <ToggleGroupItem value="cards" aria-label="Cards view">
                <Grid3X3 className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Dialog open={showNewNoteDialog} onOpenChange={setShowNewNoteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="note-title">Note Title</Label>
                    <Input
                      id="note-title"
                      placeholder="Enter note title..."
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateNote()
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowNewNoteDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateNote} disabled={!newNoteTitle.trim()}>
                      Create Note
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? "No notes found" : "No notes yet"}
                </h3>
                <p className="text-muted-foreground text-center">
                  {searchQuery 
                    ? "Try adjusting your search terms" 
                    : "Create your first note to get started"
                  }
                </p>
              </div>
            ) : viewMode === "cards" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredNotes.map((note) => (
                  <Card 
                    key={note.id} 
                    className="group hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleOpenNote(note, false)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-medium line-clamp-2 pr-2 flex items-center gap-2">
                          {note.title}
                          {note.pinned && <Badge variant="secondary" className="text-[10px]">Pinned</Badge>}
                        </CardTitle>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePinned(note.id)
                            }}
                            title={note.pinned ? "Unpin" : "Pin"}
                          >
                            {note.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenNote(note, true)
                            }}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Note</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{note.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs text-muted-foreground line-clamp-3 mb-3">
                        {stripHtmlForPreview(note.content, 100)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(note.lastModified, "MMM d, h:mm a")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotes.map((note) => (
                  <Card 
                    key={note.id} 
                    className="group cursor-pointer"
                    onClick={() => handleOpenNote(note, false)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium truncate flex items-center gap-2">{note.title}{note.pinned && <Badge variant="secondary" className="text-[10px]">Pinned</Badge>}</h3>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {format(note.lastModified, "MMM d")}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {expandedNotes.has(note.id) ? (
                              <div className="prose prose-sm max-w-none">{renderFormattedContent(note.content || "No content")}</div>
                            ) : (
                              stripHtmlForPreview(note.content, 150)
                            )}
                          </div>
                          {note.content && note.content.length > 150 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 mt-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleNoteExpansion(note.id)
                              }}
                            >
                              {expandedNotes.has(note.id) ? (
                                <>
                                  <ChevronUp className="h-3 w-3 mr-1" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Show more
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePinned(note.id)
                            }}
                            title={note.pinned ? "Unpin" : "Pin"}
                          >
                            {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenNote(note, true)
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Note</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{note.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

             {/* Note Editor Dialog */}
       <Dialog open={showNoteDialog} onOpenChange={(open) => {
         if (!open) {
           if (isDirty) {
             setPendingAction({ type: "close-dialog" })
             setShowUnsavedDialog(true)
             return
           }
         }
         setShowNoteDialog(open)
       }}>
         <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
           <DialogHeader className="shrink-0">
             <div className="flex items-center justify-between">
               <DialogTitle>
                 {isEditing ? (
                   <Input
                     value={editingTitle}
                     onChange={(e) => setEditingTitle(e.target.value)}
                     className="text-lg font-semibold border-none px-0 h-auto focus-visible:ring-0"
                     placeholder="Note title..."
                   />
                 ) : (
                   selectedNote?.title
                 )}
               </DialogTitle>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      {isSaving && <span className="text-xs text-muted-foreground">Saving…</span>}
                      {!isSaving && isDirty && <span className="text-xs text-muted-foreground">Unsaved</span>}
                      {!isDirty && !isSaving && <span className="text-xs text-muted-foreground">Saved</span>}
                      <Button variant="ghost" onClick={() => setShowLivePreview((v) => !v)} title="Toggle live preview">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSaveNote}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      {selectedNote && (
                        <Button variant="ghost" onClick={() => togglePinned(selectedNote.id)} title={selectedNote.pinned ? "Unpin" : "Pin"}>
                          {selectedNote.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button onClick={() => setIsEditing(true)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
             </div>
             {selectedNote && (
               <p className="text-sm text-muted-foreground">
                 Last modified: {format(selectedNote.lastModified, "MMM d, yyyy 'at' h:mm a")}
               </p>
             )}
           </DialogHeader>
                     <div className="flex-1 min-h-0 flex flex-col">
            {isEditing ? (
              <>
                {/* Formatting Toolbar */}
                <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => applyFormatting('bold')}
                    title="Bold (Ctrl/Cmd+B)"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => applyFormatting('italic')}
                    title="Italic (Ctrl/Cmd+I)"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => applyFormatting('underline')}
                    title="Underline (Ctrl/Cmd+U)"
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => applyFormatting('code')}
                    title="Code"
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                </div>
                <div className={`${showLivePreview ? 'grid grid-cols-2 gap-4 p-2' : ''} flex-1`}>
                  <Textarea
                    ref={setTextareaRef}
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    placeholder="Start writing your note..."
                    className={`${showLivePreview ? 'min-h-full border rounded' : 'flex-1 resize-none border-none'} focus-visible:ring-0 text-sm`}
                  />
                  {showLivePreview && (
                    <div className="min-h-full border rounded p-4 overflow-auto text-sm">
                      {renderFormattedContent(editingContent)}
                    </div>
                  )}
                </div>
              </>
            ) : (
               <div className="h-full flex flex-col">
                 <ScrollArea className="flex-1">
                   <div className="text-sm leading-relaxed p-4 min-h-full">
                     {renderFormattedContent(selectedNote?.content || "")}
                   </div>
                 </ScrollArea>
               </div>
             )}
           </div>
         </DialogContent>
        </Dialog>

        {/* Unsaved changes dialog */}
        <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. Do you want to save them before continuing?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setPendingAction(null) }}>Cancel</AlertDialogCancel>
              <Button variant="secondary" onClick={() => { setShowUnsavedDialog(false); if (selectedNote && editingTitle.trim()) { updateNote(selectedNote.id, editingTitle.trim(), editingContent) } executePendingAction(pendingAction) }}>Save</Button>
              <AlertDialogAction onClick={() => { setShowUnsavedDialog(false); if (selectedNote) { setEditingTitle(selectedNote.title); setEditingContent(selectedNote.content || '') } executePendingAction(pendingAction) }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Discard</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  )
}