"use client"

import { useState } from "react"
import { Code, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQueryTabs } from "@/hooks/use-query-tabs"
import { MockQueryService } from "@/services/mock-query-service"
import type { QueryTab } from "@/types/query"

interface QueryTemplatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QueryTemplatesDialog({ open, onOpenChange }: QueryTemplatesDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const { createTab, updateTab, getActiveTab, tabs, setActiveTabId } = useQueryTabs()

  const activeTab = getActiveTab()
  const templates = MockQueryService.getQueryTemplates()

  const categories = [
    { id: "all", name: "All Templates" },
    { id: "select", name: "SELECT" },
    { id: "insert", name: "INSERT" },
    { id: "update", name: "UPDATE" },
    { id: "delete", name: "DELETE" },
    { id: "ddl", name: "DDL" },
  ]

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.content.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const loadTemplate = (content: string) => {
    // Create a new tab with the template content
    createTab(content)
    onOpenChange(false)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "select":
        return "bg-blue-100 text-blue-800"
      case "insert":
        return "bg-green-100 text-green-800"
      case "update":
        return "bg-yellow-100 text-yellow-800"
      case "delete":
        return "bg-red-100 text-red-800"
      case "ddl":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Query Templates</DialogTitle>
          <DialogDescription>Choose from common SQL query templates to get started quickly.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-6">
              {categories.map((category) => (
                <TabsTrigger key={category.id} value={category.id} className="text-xs">
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-4">
              <ScrollArea className="h-96">
                <div className="grid gap-3">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No templates match your search</div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer group"
                        onClick={() => loadTemplate(template.content)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Code className="h-4 w-4 text-muted-foreground" />
                              <h4 className="font-medium">{template.name}</h4>
                              <Badge className={`text-xs ${getCategoryColor(template.category)}`}>
                                {template.category.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation()
                              loadTemplate(template.content)
                            }}
                          >
                            Use Template
                          </Button>
                        </div>

                        <div className="text-sm font-mono bg-muted/30 p-3 rounded border">
                          <pre className="whitespace-pre-wrap text-xs">{template.content}</pre>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
