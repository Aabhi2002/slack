
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Lightbulb, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle } from "lucide-react";
import type { ToneAnalysis } from "@/utils/analyzeTone";

interface MessageToneAnalysisProps {
  data: ToneAnalysis | null;
  loading?: boolean;
}

const getSentimentIcon = (sentiment: string) => {
  switch (sentiment) {
    case 'positive':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'negative':
      return <AlertTriangle className="w-4 h-4" />;
    default:
      return <Minus className="w-4 h-4" />;
  }
};

const getImpactIcon = (impact: string) => {
  switch (impact?.toLowerCase()) {
    case 'high':
      return <TrendingUp className="w-4 h-4" />;
    case 'low':
      return <TrendingDown className="w-4 h-4" />;
    default:
      return <Minus className="w-4 h-4" />;
  }
};

const getSentimentColor = (sentiment: string) => {
  switch (sentiment) {
    case 'positive':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'negative':
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    default:
      return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
};

const getImpactColor = (impact: string) => {
  switch (impact?.toLowerCase()) {
    case 'high':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'medium':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'low':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    default:
      return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
};

export function MessageToneAnalysis({ data, loading }: MessageToneAnalysisProps) {
  console.log("[MessageToneAnalysis] props", { data, loading });
  
  if (loading) return (
    <div className="mt-3 flex items-center text-slate-400 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-purple-500/20 animate-ping"></div>
        <span className="text-sm">Analyzing message tone...</span>
      </div>
    </div>
  );
  
  if (!data) return (
    <div className="mt-3 text-sm text-slate-500">
      <span className="italic">Unable to analyze tone. Please try again or modify your message.</span>
    </div>
  );
  
  return (
    <Card className={cn(
      "mt-3 px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-slate-700/50 rounded-xl shadow-xl",
      "animate-fade-in w-full transition-all duration-300"
    )}>
      <div className="space-y-3">
        {/* Tone & Impact Badges */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-300">Tone & Impact:</span>
          
          {/* Sentiment Badge */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-200",
            getSentimentColor(data.sentiment)
          )}>
            {getSentimentIcon(data.sentiment)}
            <span className="capitalize">{data.sentiment || 'Neutral'}</span>
          </div>
          
          {/* Impact Badge */}
          {data.impact && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-200",
              getImpactColor(data.impact)
            )}>
              {getImpactIcon(data.impact)}
              <span className="capitalize">{data.impact}</span>
            </div>
          )}
        </div>

        {/* Tone Flags */}
        {Array.isArray(data.tone_flags) && data.tone_flags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.tone_flags.map(flag => (
              <Badge 
                key={flag} 
                className="bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-colors duration-200"
              >
                {flag}
              </Badge>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {data.suggestions && data.suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-300">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">Suggestions:</span>
            </div>
            <div className="space-y-2 pl-6">
              {data.suggestions.map((suggestion, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-2 flex-shrink-0"></div>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
