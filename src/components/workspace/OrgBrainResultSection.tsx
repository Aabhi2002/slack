
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Info, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type SectionType = "summary" | "blockers" | "participants" | "decisions" | string;

// Neon accent colors for dark mode
const sectionConfig: Record<
  SectionType,
  { icon: React.ReactNode; title: string; boxColor: string; borderColor: string; textColor: string }
> = {
  summary: {
    icon: <Info className="text-[#a084ee]" size={22} />,
    title: "Notes",
    boxColor: "bg-[#18181c]",
    borderColor: "border-[#19183d]",
    textColor: "text-[#c3b7fa]",
  },
  blockers: {
    icon: <Info className="text-[#ff3366]" size={22} />,
    title: "Blockers",
    boxColor: "bg-[#1a1216]",
    borderColor: "border-[#8d2355]",
    textColor: "text-[#ff93c4]",
  },
  participants: {
    icon: <Users className="text-[#62d2ff]" size={22} />,
    title: "Participants",
    boxColor: "bg-[#12212c]",
    borderColor: "border-[#383d51]",
    textColor: "text-[#8ad2fa]",
  },
  decisions: {
    icon: <Info className="text-[#6afd7a]" size={22} />,
    title: "Decisions",
    boxColor: "bg-[#132619]",
    borderColor: "border-[#395f3e]",
    textColor: "text-[#a2f5b5]",
  },
  default: {
    icon: <Info className="text-[#7a7aee]" size={22} />,
    title: "Other",
    boxColor: "bg-[#18181c]",
    borderColor: "border-[#292897]",
    textColor: "text-[#bcbcf6]",
  },
};

interface OrgBrainResultSectionProps {
  type: SectionType;
  value: any;
  onCopy?: (label: string, raw: any) => void;
  isCopied?: boolean;
}

export function OrgBrainResultSection({
  type,
  value,
  onCopy,
  isCopied,
}: OrgBrainResultSectionProps) {
  const config = sectionConfig[type] || {
    ...sectionConfig.default,
    title: type[0]?.toUpperCase() + type.slice(1),
  };

  // If value is empty, don't render.
  if (
    value == null ||
    (typeof value === "string" && !value.trim()) ||
    (Array.isArray(value) && value.length === 0)
  )
    return null;

  return (
    <div
      className={`w-full rounded-xl border ${config.borderColor} ${config.boxColor} px-6 py-3 flex flex-col gap-2 animate-fade-in`}
      style={{
        boxShadow: "0 2px 14px 0 rgba(80,88,168,0.10)",
      }}
    >
      <div className="flex flex-row items-center mb-1">
        <span>{config.icon}</span>
        <h3 className={`ml-2 text-lg font-semibold ${config.textColor}`}>
          {config.title}
        </h3>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onCopy?.(config.title, value)}
          className={`ml-auto my-1 rounded-full hover:bg-white/10 focus:ring-2 focus:ring-inset focus:ring-[#a084ee] text-white`}
          tabIndex={-1}
          aria-label={`Copy ${config.title}`}
        >
          <Copy className="w-5 h-5 text-white" />
        </Button>
      </div>
      <div>
        {Array.isArray(value) ? (
          <ul className="flex flex-wrap gap-2">
            {type === "participants"
              ? value.map((v: string, i) => (
                  <span
                    key={i}
                    className="rounded-xl bg-[#221b33] text-[#a084ee] text-base font-medium px-3 py-1 shadow border border-[#a084ee66]"
                  >
                    {v}
                  </span>
                ))
              : value.map((v: string, i) => (
                  <li key={i} className="text-base text-[#babdca]">{v}</li>
                ))}
          </ul>
        ) : (
          <div className="whitespace-pre-line text-base text-[#e6e6f6] font-normal leading-relaxed">
            {typeof value === "object" ? (
              <pre className="text-xs text-[#cabfff] bg-[#232136] p-2 rounded">{JSON.stringify(value, null, 2)}</pre>
            ) : (
              value
            )}
          </div>
        )}
      </div>
    </div>
  );
}
