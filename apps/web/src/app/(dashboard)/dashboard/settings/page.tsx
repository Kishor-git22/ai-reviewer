'use client'

import { useState, useEffect } from 'react'
import { useUserSettings, useUpdateSettings } from '@/hooks/usePrAnalysis'
import { ModelSelector } from '@/components/dashboard/ModelSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Save, Loader2, ShieldCheck, Zap, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { data: settings, isLoading } = useUserSettings()
  const updateMutation = useUpdateSettings()
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  useEffect(() => {
    if (settings?.selectedModels) {
      setSelectedModels(settings.selectedModels)
    }
  }, [settings])

  const handleSave = async () => {
    if (selectedModels.length !== 3) {
      toast.error('Please select exactly 3 AI models')
      return
    }

    try {
      await updateMutation.mutateAsync({ selectedModels })
      toast.success(
        'Settings saved successfully! These models will now be used for all automatic PR reviews.'
      )
    } catch (error) {
      toast.error('Failed to save settings')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    // Same scrollable-box treatment as the dashboard page: the shared
    // dashboard <main> is overflow-hidden now that each page owns its own
    // scroll region, so this needs to provide its own or it'd just clip
    // instead of scrolling.
    <div className="dashboard-scroll h-full overflow-y-auto rounded-b-2xl border-x border-b border-border/60 bg-background/40">
      <div className="mx-auto max-w-5xl space-y-12 p-8 sm:p-12">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Review panel
            </h1>
          </div>
          <p className="max-w-2xl text-base font-medium text-muted-foreground">
            Choose the models that debate every pull request in your activated repositories. A
            finding only surfaces once two of the three agree.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-border/60 bg-card/40">
            <CardContent className="pt-6">
              <ShieldCheck className="mb-4 h-6 w-6 text-success" />
              <h3 className="text-sm font-semibold text-foreground">Consensus-driven</h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Multiple perspectives keep precision high and false positives low.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardContent className="pt-6">
              <Zap className="mb-4 h-6 w-6 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">Zero-config CI</h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Once set up, reviews run automatically on every push.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardContent className="pt-6">
              <MessageSquare className="mb-4 h-6 w-6 text-agent-1" />
              <h3 className="text-sm font-semibold text-foreground">Open debate</h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Agents work through disagreements before posting a verdict.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Model Selection Section */}
        <div className="space-y-8">
          <ModelSelector selectedModels={selectedModels} onChange={setSelectedModels} />

          <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/40 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Panel size: <span className="text-primary">{selectedModels.length} / 3</span>
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Exactly 3 agents are required to debate to consensus
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={selectedModels.length !== 3 || updateMutation.isPending}
              className="h-12 w-full gap-2 rounded-lg px-8 font-semibold transition-transform active:scale-95 disabled:grayscale sm:w-auto"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save panel
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
