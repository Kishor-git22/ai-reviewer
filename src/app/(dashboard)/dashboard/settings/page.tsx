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
      toast.success('Settings saved successfully! These models will now be used for all automatic PR reviews.')
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
    <div className="mx-auto max-w-5xl space-y-12 p-8 sm:p-12">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            AI Configuration
          </h1>
        </div>
        <p className="max-w-2xl text-lg font-bold text-muted-foreground">
          Configure your autonomous AI team. These selected models will collaborate to review every Pull Request in your activated repositories.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <ShieldCheck className="mb-4 h-8 w-8 text-green-400" />
            <h3 className="text-sm font-black text-foreground">Consensus Driven</h3>
            <p className="mt-1 text-xs font-bold text-muted-foreground">Multiple perspectives ensure high precision and low false positives.</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <Zap className="mb-4 h-8 w-8 text-yellow-400" />
            <h3 className="text-sm font-black text-foreground">Zero-Config CI</h3>
            <p className="mt-1 text-xs font-bold text-muted-foreground">Once configured, reviews happen automatically on every PR push.</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <MessageSquare className="mb-4 h-8 w-8 text-blue-400" />
            <h3 className="text-sm font-black text-foreground">Agent Debate</h3>
            <p className="mt-1 text-xs font-bold text-muted-foreground">Agents interact to resolve conflicts before posting the final verdict.</p>
          </CardContent>
        </Card>
      </div>

      {/* Model Selection Section */}
      <div className="space-y-8">
        <ModelSelector selectedModels={selectedModels} onChange={setSelectedModels} />
        
        <div className="flex items-center justify-between rounded-[2.5rem] border border-border/50 bg-card/50 p-6 backdrop-blur-xl">
          <div className="hidden sm:block">
            <p className="text-sm font-black text-foreground">
              Selected Team: <span className="text-primary">{selectedModels.length} / 3</span>
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Exactly 3 agents required for consensus debate
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleSave}
            disabled={selectedModels.length !== 3 || updateMutation.isPending}
            className="h-14 gap-2 rounded-full px-10 text-lg font-black shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:grayscale"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save AI Configuration
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
