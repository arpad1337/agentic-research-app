import React from "react";
import { resolvePersonality, personalities } from "@/utils";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "./ui/label";

export interface PersonalitySelectorProps {
  currentPersonality?: string;
  onPersonalityChange?: (newPersonality: string) => void;
  className?: string;
}

export function PersonalitySelector({
  currentPersonality = undefined,
  onPersonalityChange,
  className = "",
}: PersonalitySelectorProps) {
  return (
    <div className={`w-full ${className}`}>
      <Label
        htmlFor="personality-select"
        className="block text-xs font-medium text-muted-foreground mb-1"
      >
        Agent Personality
      </Label>
      <Select
        name="personality"
        onValueChange={
          !!onPersonalityChange ? onPersonalityChange : (v: string) => {}
        }
        value={currentPersonality}
      >
        <SelectTrigger id="personality-select" className="w-full">
          <SelectValue placeholder="Select a personality" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {Object.entries(personalities).map(([key]) => (
              <SelectItem key={key} value={key}>
                {resolvePersonality(key)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
