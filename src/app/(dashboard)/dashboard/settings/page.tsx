'use client'

import { useState, useEffect } from 'react'
import { useUserSettings, useUpdateSettings } from '@/hooks/usePrAnalysis'
import { NVIDIA_MODELS } from '@/components/dashboard/ModelSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Sparkles, 
  Save, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  MessageSquare, 
  ChevronDown, 
  Cpu, 
  Link2, 
  FileCode 
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { data: settings, isLoading } = useUserSettings()
  const updateMutation = useUpdateSettings()
  
  const [codeReviewModel, setCodeReviewModel] = useState('llama-3.1')
  const [securityModel, setSecurityModel] = useState('deepseek-v4-pro')
  const [scoringModel, setScoringModel] = useState('mistral-medium-3.5')
  const [referenceModel, setReferenceModel] = useState('phi-4')

  useEffect(() => {
    if (settings) {
      if (settings.codeReviewModel) setCodeReviewModel(settings.codeReviewModel)
      if (settings.securityModel) setSecurityModel(settings.securityModel)
      if (settings.scoringModel) setScoringModel(settings.scoringModel)
      if (settings.referenceModel) setReferenceModel(settings.referenceModel)
    }
  }, [settings])

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        codeReviewModel,
        securityModel,
        scoringModel,
        referenceModel,
      })
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

  const RoleSelector = ({ 
    label, 
    description, 
    value, 
    onChange, 
    icon: Icon 
  }: { 
    label: string; 
    description: string; 
    value: string; 
    onChange: (val: string) => void; 
    icon: any;
  }) => {
    const selectedInfo = NVIDIA_MODELS.find(m => m.id === value);
    
    return (
      <Card className="border-border/50 bg-card/30 backdrop-blur-xl p-6 rounded-3xl flex flex-col justify-between gap-6 transition-all hover:border-primary/30 shadow-inner">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black text-foreground">{label}</h3>
          </div>
          <p className="text-xs font-bold text-muted-foreground leading-relaxed">{description}</p>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Select Agent Model</label>
          <div className="relative">
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-12 rounded-xl border border-border/50 bg-background/50 px-4 py-2 pr-10 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer transition-all hover:bg-background/80"
            >
              {NVIDIA_MODELS.map((model) => (
                <option key={model.id} value={model.id} className="bg-background text-foreground font-semibold">
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
          {selectedInfo && (
            <p className="text-[10px] italic font-semibold text-primary/80 mt-1">
              ✨ {selectedInfo.capability} — {selectedInfo.description}
            </p>
          )}
        </div>
      </Card>
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
        <p className="max-w-2xl text-lg font-bold text-muted-foreground font-sans">
          Configure your autonomous AI team. Choose a dedicated model for each role to perform concurrent, high-speed Pull Request reviews.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <ShieldCheck className="mb-4 h-8 w-8 text-green-400" />
            <h3 className="text-sm font-black text-foreground">Dedicated Roles</h3>
            <p className="mt-1 text-xs font-bold text-muted-foreground">Specialized agents execute parallel checks optimized for quality, security, and context.</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <Zap className="mb-4 h-8 w-8 text-yellow-400" />
            <h3 className="text-sm font-black text-foreground">Lightning Fast</h3>
            <p className="mt-1 text-xs font-bold text-muted-foreground">Concurrent pipeline completes detailed reviews in under 30 seconds.</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <MessageSquare className="mb-4 h-8 w-8 text-blue-400" />
            <h3 className="text-sm font-black text-foreground">Full Compliance</h3>
            <p className="mt-1 text-xs font-bold text-muted-foreground">Automatically link findings to industry standards like CWE, OWASP, and MDN.</p>
          </CardContent>
        </Card>
      </div>

      {/* Model Selection Section */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <RoleSelector 
            label="Code Quality & Architecture Guard" 
            description="Analyzes code changes for readability, clean code patterns, performance bottlenecks, and architectural violations." 
            value={codeReviewModel} 
            onChange={setCodeReviewModel} 
            icon={FileCode} 
          />
          <RoleSelector 
            label="Security Compliance & Risk Auditor" 
            description="Identifies security vulnerabilities, injection risks, authentication flaws, credential leaks, and OWASP Top 10 issues." 
            value={securityModel} 
            onChange={setSecurityModel} 
            icon={ShieldCheck} 
          />
          <RoleSelector 
            label="Quantitative Metrics & Scoring Engine" 
            description="Evaluates the overall diff and findings to compute quality/security scores and draft the pull request review summary." 
            value={scoringModel} 
            onChange={setScoringModel} 
            icon={Cpu} 
          />
          <RoleSelector 
            label="Compliance Standards Referencer" 
            description="Augments all identified findings with compliance documentation, CWE codes, OWASP references, or official language docs." 
            value={referenceModel} 
            onChange={setReferenceModel} 
            icon={Link2} 
          />
        </div>
        
        <div className="flex items-center justify-between rounded-[2.5rem] border border-border/50 bg-card/50 p-6 backdrop-blur-xl">
          <div className="hidden sm:block">
            <p className="text-sm font-black text-foreground">
              Ready to Save Configuration
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Four specialized agents will be deployed to your repository
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleSave}
            disabled={updateMutation.isPending}
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
