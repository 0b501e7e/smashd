import { CustomizationOptions } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  toppings: 'Ingredientes',
  sauces: 'Salsas',
  extras: 'Extras',
};

const toTitleCase = (value: string) =>
  value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export const getCategoryLabel = (key: string): string => {
  const normalized = key.toLowerCase();
  return CATEGORY_LABELS[normalized] || toTitleCase(normalized);
};

export const getSelectedCustomizationEntries = (customizations?: CustomizationOptions) => {
  if (!customizations?.selected) {
    return [];
  }

  return Object.entries(customizations.selected)
    .filter(([, values]) => Array.isArray(values) && values.length > 0)
    .map(([key, values]) => ({
      key,
      label: getCategoryLabel(key),
      values,
    }));
};
