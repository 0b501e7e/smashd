'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Plus, Minus, X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { PaymentMethodDTO } from '@shared/contracts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
  imageUrl?: string | null;
}

interface CustomizationOption {
  id: number;
  name: string;
  price: number;
  categoryId: number;
  isDefaultSelected: boolean;
}

interface CustomizationCategory {
  id: number;
  name: string;
  options: CustomizationOption[];
}

interface OrderLine {
  lineId: string;
  menuItem: MenuItem;
  quantity: number;
  unitPrice: number; // includes customization cost
  customizations?: {
    selected?: Record<string, string[]>;
    removed?: string[];
  };
}

type PaymentMethod = Exclude<PaymentMethodDTO, 'SUMUP'>;

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['BURGER', 'SIDE', 'DRINK', 'DESSERT'];
const CATEGORY_LABELS: Record<string, string> = {
  BURGER: 'Burgers',
  SIDE: 'Sides',
  DRINK: 'Drinks',
  DESSERT: 'Desserts',
};

function formatCurrency(amount: number) {
  return `€${amount.toFixed(2)}`;
}

function shortCustomizationSummary(line: OrderLine): string | null {
  const parts: string[] = [];
  if (line.customizations?.selected) {
    for (const names of Object.values(line.customizations.selected)) {
      parts.push(...names);
    }
  }
  if (line.customizations?.removed?.length) {
    parts.push(...line.customizations.removed.map(n => `no ${n}`));
  }
  return parts.length ? parts.join(', ') : null;
}

// ─── Customization Modal Content ─────────────────────────────────────────────

function CustomizationContent({
  item,
  onConfirm,
  onCancel,
}: {
  item: MenuItem;
  onConfirm: (line: Omit<OrderLine, 'lineId'>) => void;
  onCancel: () => void;
}) {
  const [categories, setCategories] = useState<CustomizationCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item.category !== 'BURGER') return;
    const fetchCustomizations = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/menu/items/${item.id}/customizations`);
        const data = await res.json();
        const grouped: Record<string, CustomizationOption[]> = data.data || data || {};
        const cats = Object.entries(grouped).map(([name, options], i) => ({
          id: options[0]?.categoryId ?? -(i + 1),
          name,
          options,
        }));
        setCategories(cats);
        // Initialise defaults
        const defaults: Record<number, number[]> = {};
        cats.forEach(cat => {
          defaults[cat.id] = cat.options.filter(o => o.isDefaultSelected).map(o => o.id);
        });
        setSelectedOptions(defaults);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomizations();
  }, [item]);

  const unitPrice = useMemo(() => {
    if (categories.length === 0) return item.price;
    let extra = 0;
    categories.forEach(cat => {
      (selectedOptions[cat.id] ?? []).forEach(optId => {
        const opt = cat.options.find(o => o.id === optId);
        if (opt && !opt.isDefaultSelected) extra += opt.price;
      });
    });
    return item.price + extra;
  }, [item, categories, selectedOptions]);

  const toggle = (categoryId: number, optionId: number) => {
    setSelectedOptions(prev => {
      const current = prev[categoryId] ?? [];
      const next = current.includes(optionId)
        ? current.filter(id => id !== optionId)
        : [...current, optionId];
      return { ...prev, [categoryId]: next };
    });
  };

  const handleConfirm = () => {
    const selected: Record<string, string[]> = {};
    const removed: string[] = [];

    categories.forEach(cat => {
      const sel = selectedOptions[cat.id] ?? [];
      const names = sel.map(id => cat.options.find(o => o.id === id)?.name).filter(Boolean) as string[];
      if (names.length) selected[cat.name.toLowerCase()] = names;
      cat.options.forEach(opt => {
        if (opt.isDefaultSelected && !sel.includes(opt.id)) removed.push(opt.name);
      });
    });

    const hasCustomizations = Object.keys(selected).length > 0 || removed.length > 0;

    onConfirm({
      menuItem: item,
      quantity,
      unitPrice,
      customizations: hasCustomizations ? {
        ...(Object.keys(selected).length ? { selected } : {}),
        ...(removed.length ? { removed } : {}),
      } : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Item header */}
      <div>
        <p className="text-sm text-gray-400">Base price: {formatCurrency(item.price)}</p>
      </div>

      {/* Customizations */}
      {item.category === 'BURGER' && (
        isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/3 bg-gray-700" />
            <Skeleton className="h-8 w-full bg-gray-700" />
            <Skeleton className="h-8 w-full bg-gray-700" />
          </div>
        ) : (
          categories.map((cat, i) => (
            <React.Fragment key={cat.id}>
              {i > 0 && <Separator className="bg-gray-700" />}
              <div>
                <h4 className="mb-2 text-base font-semibold text-yellow-300">{cat.name}</h4>
                <div className="space-y-2">
                  {cat.options.map(opt => (
                    <div
                      key={opt.id}
                      className="flex min-h-14 items-center justify-between rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 hover:bg-gray-800/60"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`opt-${opt.id}`}
                          checked={(selectedOptions[cat.id] ?? []).includes(opt.id)}
                          onCheckedChange={() => toggle(cat.id, opt.id)}
                          className="h-5 w-5 border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black"
                        />
                        <Label htmlFor={`opt-${opt.id}`} className="cursor-pointer text-base leading-tight">
                          <span className="block text-white">{opt.name}</span>
                          {opt.isDefaultSelected && (
                            <span className="mt-1 block text-sm italic text-yellow-500">Included</span>
                          )}
                        </Label>
                      </div>
                      {opt.price > 0 && !opt.isDefaultSelected && (
                        <span className="pl-3 text-sm text-gray-400">+{formatCurrency(opt.price)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </React.Fragment>
          ))
        )
      )}

      {/* Quantity & total */}
      <Separator className="bg-gray-700" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center font-mono text-lg text-white">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
            onClick={() => setQuantity(q => q + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-3 sm:justify-end">
          <Button
            variant="outline"
            className="h-11 flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 sm:flex-none"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="h-11 flex-1 bg-yellow-400 font-bold text-black hover:bg-yellow-300 sm:flex-none"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            Add · {formatCurrency(unitPrice * quantity)}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuickOrder() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null);

  const isTabletUp = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await api.get('/admin/menu/all');
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to fetch menu');
        setMenuItems((result.data || []).filter((item: MenuItem) => item.isAvailable));
      } catch (err: any) {
        setLoadError(err.message || 'Failed to load menu');
      } finally {
        setIsLoadingMenu(false);
      }
    };
    fetchMenu();
  }, []);

  const addLine = (line: Omit<OrderLine, 'lineId'>) => {
    const lineId = `${line.menuItem.id}-${Date.now()}`;
    setOrderLines(prev => [...prev, { ...line, lineId }]);
    setSelectedItem(null);
  };

  const removeLine = (lineId: string) => {
    setOrderLines(prev => prev.filter(l => l.lineId !== lineId));
  };

  const total = orderLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const totalItems = orderLines.reduce((sum, l) => sum + l.quantity, 0);

  const handleSubmit = async () => {
    if (orderLines.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.post('/admin/orders/quick-create', {
        paymentMethod,
        items: orderLines.map(l => ({
          menuItemId: l.menuItem.id,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          customizations: l.customizations,
        })),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || result.message || 'Failed to create order');
      setSuccessOrderId(result.data.id);
      setOrderLines([]);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const grouped = CATEGORY_ORDER.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    const items = menuItems.filter(m => m.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  if (isLoadingMenu) {
    return <div className="text-gray-400 py-8 text-center">Loading menu...</div>;
  }

  if (loadError) {
    return <div className="text-red-400 py-8 text-center">{loadError}</div>;
  }

  const modalContent = selectedItem ? (
    <CustomizationContent
      item={selectedItem}
      onConfirm={addLine}
      onCancel={() => setSelectedItem(null)}
    />
  ) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row">

      {/* Customization modal — Dialog on desktop, Drawer on mobile */}
      {isTabletUp ? (
        <Dialog open={!!selectedItem} onOpenChange={open => { if (!open) setSelectedItem(null); }}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-gray-700 bg-gray-900 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">{selectedItem?.name}</DialogTitle>
            </DialogHeader>
            {modalContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={!!selectedItem} onOpenChange={open => { if (!open) setSelectedItem(null); }}>
          <DrawerContent className="bg-gray-900 border-gray-700 text-white max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle className="text-white">{selectedItem?.name}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">
              {modalContent}
            </div>
            <DrawerFooter />
          </DrawerContent>
        </Drawer>
      )}

      {/* Menu grid */}
      <div className="flex-1 space-y-6">
        {successOrderId && (
          <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 flex items-center justify-between">
            <span className="text-green-300 font-medium">Order #{successOrderId} sent to kitchen</span>
            <button onClick={() => setSuccessOrderId(null)} className="text-green-400 hover:text-green-200 text-sm underline">
              New order
            </button>
          </div>
        )}

        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-yellow-400">
              {CATEGORY_LABELS[cat] ?? cat}
            </h3>

            {/* Phone: horizontal scroller */}
            <div className="flex gap-3 overflow-x-auto pb-2 sm:hidden">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="flex h-24 w-[68vw] flex-shrink-0 flex-col justify-between rounded-2xl border border-gray-700 bg-[#111111] p-4 text-left transition-transform active:scale-[0.98]"
                >
                  <p className="line-clamp-2 text-base font-semibold leading-tight text-white">{item.name}</p>
                  <p className="text-base font-bold text-yellow-400">{formatCurrency(item.price)}</p>
                </button>
              ))}
            </div>

            {/* Tablet and desktop: grid with larger tap targets */}
            <div className="hidden grid-cols-2 gap-3 sm:grid xl:grid-cols-3">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="min-h-28 rounded-2xl border border-gray-700 bg-gray-900 p-4 text-left transition-colors hover:border-yellow-400 hover:bg-yellow-400/10"
                >
                  <div className="flex h-full flex-col justify-between gap-3">
                    <p className="text-base font-medium leading-tight text-white">{item.name}</p>
                    <p className="text-base font-semibold text-yellow-400">{formatCurrency(item.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {orderLines.length > 0 && (
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 md:hidden">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Current Order</h3>
              <span className="text-sm text-gray-400">{totalItems} items</span>
            </div>

            <ul className="space-y-3">
              {orderLines.map(line => {
                const summary = shortCustomizationSummary(line);
                return (
                  <li key={line.lineId} className="flex items-start gap-3 rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base text-white">{line.quantity}x {line.menuItem.name}</p>
                      {summary && <p className="mt-1 text-sm text-gray-400">{summary}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm font-medium text-yellow-400">
                        {formatCurrency(line.unitPrice * line.quantity)}
                      </span>
                      <button
                        onClick={() => removeLine(line.lineId)}
                        className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 transition-colors hover:border-red-500 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Order summary */}
      <div className="md:sticky md:top-4 md:w-80 md:self-start">

        {/* Mobile fixed bar */}
        <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center gap-3 border-t border-gray-700 bg-gray-950 p-3 sm:p-4 md:hidden">
          <div className="flex-1">
            <PaymentToggle value={paymentMethod} onChange={setPaymentMethod} />
          </div>
          <button
            onClick={handleSubmit}
            disabled={orderLines.length === 0 || isSubmitting}
            className="flex-shrink-0 whitespace-nowrap rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : totalItems > 0 ? `Order (${totalItems}) · ${formatCurrency(total)}` : 'Select items'}
          </button>
        </div>
        <div className="h-24 md:hidden" />

        {/* Tablet and desktop sidebar */}
        <div className="hidden space-y-4 rounded-2xl border border-gray-700 bg-gray-900 p-5 md:block">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Order</h3>
            {orderLines.length > 0 && <span className="text-sm text-gray-400">{totalItems} items</span>}
          </div>

          {submitError && (
            <p className="text-red-400 text-sm">{submitError}</p>
          )}

          {orderLines.length === 0 ? (
            <p className="text-gray-500 text-sm">Tap an item to add it</p>
          ) : (
            <ul className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {orderLines.map(line => {
                const summary = shortCustomizationSummary(line);
                return (
                  <li key={line.lineId} className="flex gap-3 rounded-xl border border-gray-800 bg-gray-950/60 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-white">{line.quantity}x {line.menuItem.name}</p>
                      {summary && <p className="mt-1 text-sm text-gray-500">{summary}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-gray-300">{formatCurrency(line.unitPrice * line.quantity)}</span>
                      <button
                        onClick={() => removeLine(line.lineId)}
                        className="rounded-lg border border-gray-700 p-2 text-gray-400 transition-colors hover:border-red-500 hover:text-red-300"
                        aria-label={`Remove ${line.menuItem.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {orderLines.length > 0 && (
            <>
              <div className="border-t border-gray-700 pt-3 flex justify-between font-bold">
                <span className="text-white">Total</span>
                <span className="text-yellow-400">{formatCurrency(total)}</span>
              </div>
              <PaymentToggle value={paymentMethod} onChange={setPaymentMethod} />
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-12 w-full bg-yellow-400 font-bold text-black hover:bg-yellow-300 disabled:opacity-40"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Create Order · ${formatCurrency(total)}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentToggle({ value, onChange }: { value: PaymentMethod; onChange: (v: PaymentMethod) => void }) {
  return (
    <div className="flex overflow-hidden rounded-xl border border-gray-700">
      {(['CASH', 'CARD_READER'] as PaymentMethod[]).map(method => (
        <button
          key={method}
          onClick={() => onChange(method)}
          className={`min-h-12 flex-1 px-3 py-3 text-sm font-medium transition-colors ${value === method ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-300 hover:text-white'}`}
        >
          {method === 'CASH' ? 'Cash' : 'Card Reader'}
        </button>
      ))}
    </div>
  );
}
