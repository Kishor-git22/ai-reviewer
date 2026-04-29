'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NVIDIA_MODELS, DEFAULT_SELECTED_MODELS } from '@/lib/data'
import { Sparkles, Mail, AlertTriangle, Trash2, CheckCircle2, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const [selectedModels, setSelectedModels] = useState(DEFAULT_SELECTED_MODELS)

  const toggleModel = (id: string) => {
    if (selectedModels.includes(id)) {
      setSelectedModels((prev) => prev.filter((m) => m !== id))
    } else if (selectedModels.length < 3) {
      setSelectedModels((prev) => [...prev, id])
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl space-y-8 p-6">
          {/* Model Selection */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                <Sparkles className="h-5 w-5 text-blue-400" />
                NVIDIA Model Selection
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  selectedModels.length === 3
                    ? 'border-green-500/20 bg-green-500/20 text-green-400'
                    : 'border-orange-500/20 bg-orange-500/20 text-orange-400'
                )}
              >
                {selectedModels.length}/3 Selected
              </Badge>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Select exactly 3 models from NVIDIA build platform for refracted consensus analysis.
            </p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {NVIDIA_MODELS.map((model) => (
                <div
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={cn(
                    'cursor-pointer rounded-xl border p-4 transition-all',
                    selectedModels.includes(model.id)
                      ? 'border-blue-500 bg-blue-500/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-muted'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <Cpu className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">{model.name}</div>
                        <div className="text-[10px] uppercase tracking-tighter opacity-60">
                          {model.provider}
                        </div>
                      </div>
                    </div>
                    {selectedModels.includes(model.id) && (
                      <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-blue-400" />
                Support & Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Having issues? Contact our open source team.
              </p>
              <Button variant="outline" className="gap-2" asChild>
                <a href="mailto:support@prism.dev">
                  <Mail className="h-4 w-4" />
                  Contact Us
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-red-500">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-sm text-muted-foreground">
                Permanent action. Data removal cannot be undone.
              </p>

              <div className="flex flex-col justify-between gap-4 rounded-xl border border-red-500/10 bg-red-500/5 p-4 md:flex-row md:items-center">
                <div>
                  <div className="text-sm font-bold text-foreground">Delete Data Permanently</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Remove all your data from our servers
                  </p>
                </div>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
