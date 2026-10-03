import type { ValueMode, ArrayOrder, EngineType } from "@/config";
import {
  VALUE_MODE_OPTIONS,
  ARRAY_ORDER_OPTIONS,
  PREGEN_ARRAY_SIZE_MIN,
  LIVE_ARRAY_SIZE_MIN,
  LIVE_ARRAY_SIZE_MAX,
} from "@/config";
import { THEMES } from "@/themes/themes";
import { THEME_IDS, type ThemeId } from "@/themes/types";
import {
  SOUND_WAVEFORMS,
  SOUND_WAVEFORM_LABELS,
  type SoundWaveform,
} from "@/sound/types";

import { useState } from "react";
import { Volume2Icon, VolumeXIcon, XIcon } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { playbackFinalFocus } from "@/hooks/use-pointer-focus";

interface SidebarProps {
  engineType: EngineType;
  algorithms: string[];
  selectedAlgorithm: string;
  valueMode: ValueMode;
  arrayOrder: ArrayOrder;
  arraySize: number;
  pregenArraySizeMax: number;
  themeId: ThemeId;
  soundWaveform: SoundWaveform;
  soundVolume: number;
  soundMuted: boolean;
  onToggleMute: () => void;
  onEngineTypeChange: (type: EngineType) => void;
  onAlgorithmChange: (algorithm: string) => void;
  onValueModeChange: (valueMode: ValueMode) => void;
  onArrayOrderChange: (arrayOrder: ArrayOrder) => void;
  onArraySizeChange: (size: number) => void;
  onThemeChange: (themeId: ThemeId) => void;
  onSoundWaveformChange: (waveform: SoundWaveform) => void;
  onSoundVolumeChange: (volume: number) => void;
  onGenerate: () => void;
  disabled?: boolean;
}

export function Sidebar({
  engineType,
  algorithms,
  selectedAlgorithm,
  valueMode,
  arrayOrder,
  arraySize,
  pregenArraySizeMax,
  themeId,
  soundWaveform,
  soundVolume,
  soundMuted,
  onToggleMute,
  onEngineTypeChange,
  onAlgorithmChange,
  onValueModeChange,
  onArrayOrderChange,
  onArraySizeChange,
  onThemeChange,
  onSoundWaveformChange,
  onSoundVolumeChange,
  onGenerate,
  disabled = false,
}: SidebarProps) {
  const { setOpenMobile } = useSidebar();
  const isPregen = engineType === "pregen";
  const sizeMin = isPregen ? PREGEN_ARRAY_SIZE_MIN : LIVE_ARRAY_SIZE_MIN;
  const sizeMax = isPregen ? pregenArraySizeMax : LIVE_ARRAY_SIZE_MAX;

  return (
    <SidebarPrimitive
      side="right"
      position="inline"
      mobileFinalFocus={playbackFinalFocus}
    >
      <SidebarHeader className="md:hidden">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Settings</h2>
          <ActionButton
            label="Close settings"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpenMobile(false)}
          >
            <XIcon data-icon="inline-start" />
          </ActionButton>
        </div>
      </SidebarHeader>
      <SidebarContent id="sort-settings" className="gap-4 p-3">
        <SidebarGroup className="p-0">
          <FieldSet className="gap-3" disabled={disabled}>
            <FieldLegend variant="legend">Engine</FieldLegend>
            <Separator />
            <ToggleGroup
              aria-label="Engine"
              variant="outline"
              size="sm"
              spacing={0}
              value={[engineType]}
              disabled={disabled}
              onValueChange={(values) => {
                if (values[0]) onEngineTypeChange(values[0] as EngineType);
              }}
              className="w-full"
            >
              <ToggleGroupItem value="pregen" className="flex-1">
                Pregen (V1)
              </ToggleGroupItem>
              <ToggleGroupItem value="live" className="flex-1">
                Live (V2)
              </ToggleGroupItem>
            </ToggleGroup>
          </FieldSet>
        </SidebarGroup>
        <SidebarGroup className="p-0">
          <FieldSet className="gap-3" disabled={disabled}>
            <FieldLegend variant="legend">Algorithm</FieldLegend>
            <Separator />
            <Field data-disabled={disabled}>
              <SettingSelect
                id="algorithm"
                value={selectedAlgorithm}
                items={algorithms.map((value) => ({
                  value,
                  label: formatAlgorithmName(value),
                }))}
                onValueChange={onAlgorithmChange}
                disabled={disabled}
              />
            </Field>
          </FieldSet>
        </SidebarGroup>
        <SidebarGroup className="p-0">
          <FieldSet className="gap-3" disabled={disabled}>
            <FieldLegend variant="legend">Array</FieldLegend>
            <Separator />
            <FieldGroup className="gap-3">
              {isPregen ? (
                <Field data-disabled={disabled}>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel id="size-label">Size</FieldLabel>
                    <output className="font-mono text-sm">{arraySize}</output>
                  </div>
                  <Slider
                    min={sizeMin}
                    max={sizeMax}
                    value={arraySize}
                    step={1}
                    onValueChange={(value) =>
                      onArraySizeChange(value as number)
                    }
                    disabled={disabled}
                    aria-labelledby="size-label"
                    getAriaValueText={(_, value) => `${value} elements`}
                  />
                </Field>
              ) : (
                <ArraySizeInput
                  key={arraySize}
                  value={arraySize}
                  min={sizeMin}
                  max={sizeMax}
                  onChange={onArraySizeChange}
                  disabled={disabled}
                />
              )}
              <Field data-disabled={disabled}>
                <FieldLabel htmlFor="value-mode">Values</FieldLabel>
                <SettingSelect
                  id="value-mode"
                  value={valueMode}
                  items={VALUE_MODE_OPTIONS}
                  onValueChange={onValueModeChange}
                  disabled={disabled}
                />
              </Field>
              <Field data-disabled={disabled}>
                <FieldLabel htmlFor="array-order">Order</FieldLabel>
                <SettingSelect
                  id="array-order"
                  value={arrayOrder}
                  items={ARRAY_ORDER_OPTIONS}
                  onValueChange={onArrayOrderChange}
                  disabled={disabled}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
        </SidebarGroup>
        <ActionButton
          label="Generate new array"
          shortcut="G"
          tooltipSide="left"
          size="sm"
          onClick={onGenerate}
          disabled={disabled}
          aria-label="Generate new array"
          aria-busy={disabled}
        >
          {disabled && <Spinner data-icon="inline-start" />}
          {disabled ? "Generating…" : "Generate"}
        </ActionButton>
        <SidebarGroup className="mt-auto p-0 pt-4">
          <FieldSet className="gap-3">
            <FieldLegend variant="legend">Customization</FieldLegend>
            <Separator />
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor="theme">Theme</FieldLabel>
                <SettingSelect
                  id="theme"
                  value={themeId}
                  items={THEME_IDS.map((value) => ({
                    value,
                    label: THEMES[value].name,
                  }))}
                  onValueChange={onThemeChange}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="sound">Sound</FieldLabel>
                <SettingSelect
                  id="sound"
                  value={soundWaveform}
                  items={SOUND_WAVEFORMS.map((value) => ({
                    value,
                    label: SOUND_WAVEFORM_LABELS[value],
                  }))}
                  onValueChange={onSoundWaveformChange}
                />
              </Field>
              <div className="flex items-end gap-2">
                <ActionButton
                  label={soundMuted ? "Unmute" : "Mute"}
                  shortcut="M"
                  tooltipSide="left"
                  variant="ghost"
                  size="icon-sm"
                  aria-pressed={soundMuted}
                  aria-keyshortcuts="M"
                  disabled={soundWaveform === "none"}
                  onClick={onToggleMute}
                >
                  {soundMuted ? (
                    <VolumeXIcon data-icon="inline-start" />
                  ) : (
                    <Volume2Icon data-icon="inline-start" />
                  )}
                </ActionButton>
                <Field
                  className="min-w-0 flex-1"
                  data-disabled={soundWaveform === "none"}
                >
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel id="volume-label">Volume</FieldLabel>
                    <output className="font-mono text-sm">
                      {Math.round(soundVolume * 100)}%
                    </output>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(soundVolume * 100)}
                    onValueChange={(value) =>
                      onSoundVolumeChange((value as number) / 100)
                    }
                    disabled={soundWaveform === "none"}
                    aria-labelledby="volume-label"
                    getAriaValueText={(_, value) => `${value} percent`}
                  />
                </Field>
              </div>
            </FieldGroup>
          </FieldSet>
        </SidebarGroup>
      </SidebarContent>
    </SidebarPrimitive>
  );
}

function SettingSelect<T extends string>({
  id,
  value,
  items,
  disabled,
  onValueChange,
}: {
  id: string;
  value: T;
  items: readonly { value: T; label: string }[];
  disabled?: boolean;
  onValueChange: (value: T) => void;
}) {
  return (
    <Select
      items={items}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
    >
      <SelectTrigger id={id} size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        align="start"
        finalFocus={playbackFinalFocus}
      >
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/** Keep an editable draft so clearing or replacing the number works naturally. */
function ArraySizeInput({
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const number = Number(draft);
  const invalid =
    draft !== "" && (!Number.isInteger(number) || number < min || number > max);
  const commit = () => {
    if (draft === "" || invalid) {
      setDraft(String(value));
      return;
    }
    onChange(number);
  };
  return (
    <Field data-invalid={invalid} data-disabled={disabled}>
      <FieldLabel htmlFor="array-size">Size</FieldLabel>
      <Input
        id="array-size"
        size="sm"
        type="number"
        min={min}
        max={max}
        step={1}
        value={draft}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={invalid ? "size-error" : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
            event.currentTarget.blur();
          }
        }}
      />
      {invalid && (
        <FieldError id="size-error">
          Enter a whole number from {min} to {max}.
        </FieldError>
      )}
    </Field>
  );
}

const SPECIAL_ALGORITHM_NAMES: Record<string, string> = {
  merge_half_buffer: "Merge Sort (Half Buffer)",
  quicksort_ll: "Quicksort (LL)",
  quicksort_lr: "Quicksort (LR)",
  introsort: "Introsort",
  radix_lsd: "Radix LSD Sort",
  radix_msd: "Radix MSD Sort",
};

/**
 * Format algorithm name for display.
 */
function formatAlgorithmName(name: string): string {
  if (SPECIAL_ALGORITHM_NAMES[name]) {
    return SPECIAL_ALGORITHM_NAMES[name];
  }

  const formatted = name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  if (!formatted.toLowerCase().endsWith("sort")) {
    return formatted + " Sort";
  }
  return formatted;
}
