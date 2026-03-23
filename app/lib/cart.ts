import type { CustomizationSelectionDTO } from '@shared/contracts';

const normalizeStringArray = (value?: string[]) =>
  Array.from(new Set((value ?? []).map((entry) => entry.trim()).filter(Boolean))).sort();

const normalizeSelected = (selected?: Record<string, string[]>) => {
  const entries = Object.entries(selected ?? {})
    .map(([key, values]) => [key.toLowerCase(), normalizeStringArray(values)] as const)
    .filter(([, values]) => values.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(entries);
};

export const normalizeCustomizationOptions = (customizations?: CustomizationSelectionDTO): CustomizationSelectionDTO | undefined => {
  if (!customizations) {
    return undefined;
  }

  const normalized: CustomizationSelectionDTO = {};
  const selected = normalizeSelected(customizations.selected);
  const removed = normalizeStringArray(customizations.removed);
  const specialRequests = customizations.specialRequests?.trim();

  if (Object.keys(selected).length > 0) {
    normalized.selected = selected;
  }

  if (removed.length > 0) {
    normalized.removed = removed;
  }

  if (specialRequests) {
    normalized.specialRequests = specialRequests;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const buildCartItemKey = (itemId: string | number, customizations?: CustomizationSelectionDTO) =>
  `${String(itemId)}:${JSON.stringify(normalizeCustomizationOptions(customizations) ?? {})}`;
