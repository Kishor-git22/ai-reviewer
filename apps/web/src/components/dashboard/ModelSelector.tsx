'use client'

import { useState } from 'react'
import { Check, Cpu, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const NVIDIA_MODELS = [
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash ⚡',
    provider: 'DeepSeek',
    description: 'Ultra-fast and efficient for quick code reviews and syntax checks.',
    capability: 'Flash Review',
  },
  {
    id: 'deepseek-v4-pro',
    name: 'Nemotron 3 Nano (30B)',
    provider: 'NVIDIA',
    description: 'High precision and deep logic for complex code changes.',
    capability: 'Logic & Reasoning',
  },
  {
    id: 'mistral-medium-3.5',
    name: 'Mistral Nemotron',
    provider: 'Mistral AI',
    description: 'Excellent at architectural review and clean code patterns.',
    capability: 'Clean Code',
  },
  {
    id: 'mistral-small-4',
    name: 'Nemotron Mini (4B) ⚡',
    provider: 'NVIDIA',
    description: 'Lightweight and reliable for standard PR feedback.',
    capability: 'Fast Review',
  },
  {
    id: 'minimax-m2.7',
    name: 'Llama 3.2 Vision (11B)',
    provider: 'Meta',
    description: 'Broad general-purpose review for security and edge cases.',
    capability: 'Security Scanning',
  },
  {
    id: 'nemotron-3-super',
    name: 'Nemotron 3 Super',
    provider: 'NVIDIA',
    description: 'Optimized for high-performance computing and NVIDIA libraries.',
    capability: 'Optimization',
  },
  {
    id: 'llama-3.1',
    name: 'Llama 3.1',
    provider: 'Meta',
    description: 'Balanced general-purpose model with broad knowledge base.',
    capability: 'General Review',
  },
  {
    id: 'gemma-2-27b',
    name: 'Nemotron Nano (9B)',
    provider: 'NVIDIA',
    description: 'High-fidelity general-purpose code review.',
    capability: 'Advanced Review',
  },
  {
    id: 'phi-4',
    name: 'Llama 3.2 (3B)',
    provider: 'Meta',
    description: 'Small but mighty, great for mathematical and logic-heavy code.',
    capability: 'Math & Logic',
  },
]

interface ModelSelectorProps {
  selectedModels: string[]
  onChange: (models: string[]) => void
}

export function ModelSelector({ selectedModels, onChange }: ModelSelectorProps) {
  const toggleModel = (id: string) => {
    if (selectedModels.includes(id)) {
      onChange(selectedModels.filter((m) => m !== id))
    } else if (selectedModels.length < 3) {
      onChange([...selectedModels, id])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="font-display text-lg font-medium tracking-tight text-foreground">
            Choose your panel
          </h3>
          <p className="text-xs font-medium text-muted-foreground">
            Pick 3 models to debate every pull request.
          </p>
        </div>
        <Badge variant="secondary" className="rounded-md px-2.5 py-1 font-semibold">
          {selectedModels.length} / 3 selected
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NVIDIA_MODELS.map((model) => {
          const isSelected = selectedModels.includes(model.id)
          const isDisabled = !isSelected && selectedModels.length >= 3
          const selectedIndex = selectedModels.indexOf(model.id)
          const agentColor = [
            'border-agent-1 ring-agent-1',
            'border-agent-2 ring-agent-2',
            'border-agent-3 ring-agent-3',
          ][selectedIndex % 3]

          return (
            <Card
              key={model.id}
              className={cn(
                'group relative cursor-pointer overflow-hidden border-border/60 bg-card/40 transition-colors hover:border-primary/40',
                isSelected && cn('ring-1', agentColor),
                isDisabled && 'cursor-not-allowed opacity-50 grayscale'
              )}
              onClick={() => !isDisabled && toggleModel(model.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/50 text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <Cpu size={18} />
                  </div>
                  {isSelected && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check size={13} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{model.name}</span>
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[8px] font-semibold uppercase tracking-wider"
                    >
                      {model.provider}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {model.description}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-primary">
                      {model.capability}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
