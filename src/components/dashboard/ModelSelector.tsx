'use client'

import { useState } from 'react'
import { Check, Cpu, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const NVIDIA_MODELS = [
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: 'DeepSeek',
    description: 'Ultra-fast and efficient for quick code reviews and syntax checks.',
    capability: 'Fast Review',
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    description: 'High precision and deep logic for complex code changes.',
    capability: 'Logic & Reasoning',
  },
  {
    id: 'mistral-medium-3.5',
    name: 'Mistral Medium 3.5',
    provider: 'Mistral AI',
    description: 'Excellent at architectural review and clean code patterns.',
    capability: 'Clean Code',
  },
  {
    id: 'mistral-small-4',
    name: 'Mistral Small 4',
    provider: 'Mistral AI',
    description: 'Lightweight and reliable for standard PR feedback.',
    capability: 'Code Quality',
  },
  {
    id: 'minimax-m2.7',
    name: 'MiniMax M2.7',
    provider: 'MiniMax',
    description: 'Specialized in security vulnerabilities and edge cases.',
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
    name: 'Llama 3.3',
    provider: 'Meta',
    description: 'The latest and most advanced Llama model for high-fidelity code review.',
    capability: 'Advanced Review',
  },
  {
    id: 'phi-4',
    name: 'Phi-4',
    provider: 'Microsoft',
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
          <h3 className="text-lg font-black tracking-tight text-foreground">Select AI Agents</h3>
          <p className="text-xs font-bold text-muted-foreground">Choose 3 models to perform the multi-agent debate.</p>
        </div>
        <Badge variant="secondary" className="rounded-full px-3 py-1 font-black">
          {selectedModels.length} / 3 Selected
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NVIDIA_MODELS.map((model) => {
          const isSelected = selectedModels.includes(model.id)
          const isDisabled = !isSelected && selectedModels.length >= 3

          return (
            <Card
              key={model.id}
              className={cn(
                'group relative cursor-pointer overflow-hidden border-border/50 bg-card/50 transition-all hover:border-primary/50',
                isSelected && 'border-primary ring-1 ring-primary',
                isDisabled && 'opacity-50 grayscale cursor-not-allowed'
              )}
              onClick={() => !isDisabled && toggleModel(model.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/50 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Cpu size={20} />
                  </div>
                  {isSelected && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-foreground">{model.name}</span>
                    <Badge variant="outline" className="text-[8px] uppercase font-black tracking-widest px-1.5 py-0">
                      {model.provider}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed font-bold text-muted-foreground">
                    {model.description}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-primary">
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
