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
    <div className="flex flex-col gap-4">
      {/* Item header */}
      <div>
        <p className="text-gray-400 text-sm">Base price: {formatCurrency(item.price)}</p>
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
                <h4 className="text-yellow-300 font-semibold mb-2">{cat.name}</h4>
                <div className="space-y-1">
                  {cat.options.map(opt => (
                    <div key={opt.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-800/60">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`opt-${opt.id}`}
                          checked={(selectedOptions[cat.id] ?? []).includes(opt.id)}
                          onCheckedChange={() => toggle(cat.id, opt.id)}
                          className="border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black"
                        />
                        <Label htmlFor={`opt-${opt.id}`} className="cursor-pointer text-sm">
                          {opt.name}
                          {opt.isDefaultSelected && (
                            <span className="ml-2 text-xs text-yellow-500 italic">Included</span>
                          )}
                        </Label>
                      </div>
                      {opt.price > 0 && !opt.isDefaultSelected && (
                        <span className="text-xs text-gray-400">+{formatCurrency(opt.price)}</span>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-white font-mono w-6 text-center">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
            onClick={() => setQuantity(q => q + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold"
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

  const isDesktop = useMediaQuery('(min-width: 768px)');

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
    <div className="flex flex-col lg:flex-row gap-6 max-w-4xl mx-auto">

      {/* Customization modal — Dialog on desktop, Drawer on mobile */}
      {isDesktop ? (
        <Dialog open={!!selectedItem} onOpenChange={open => { if (!open) setSelectedItem(null); }}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
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
            <h3 className="text-yellow-400 font-semibold text-sm uppercase tracking-wider mb-2">
              {CATEGORY_LABELS[cat] ?? cat}
            </h3>

            {/* Mobile: horizontal snap carousel — break out of parent padding */}
            <div className="lg:hidden flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="snap-start flex-shrink-0 w-[55vw] h-20 rounded-xl border border-gray-700 bg-[#111111] active:scale-[0.97] transition-transform text-left p-3 flex flex-col justify-between"
                >
                  <p className="text-white text-sm font-semibold leading-tight line-clamp-2">{item.name}</p>
                  <p className="text-yellow-400 text-sm font-bold">{formatCurrency(item.price)}</p>
                </button>
              ))}
            </div>

            {/* Desktop: grid */}
            <div className="hidden lg:grid grid-cols-3 gap-2">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="rounded-lg border border-gray-700 bg-gray-900 hover:border-yellow-400 hover:bg-yellow-400/10 p-3 text-left transition-colors"
                >
                  <p className="text-white text-sm font-medium leading-tight">{item.name}</p>
                  <p className="text-gray-400 text-xs mt-1">{formatCurrency(item.price)}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div className="lg:w-64 lg:sticky lg:top-4 lg:self-start">

        {/* Mobile fixed bar */}
        <div className="fixed bottom-0 left-0 right-0 z-10 lg:hidden bg-gray-950 border-t border-gray-700 p-3 flex items-center gap-3">
          <div className="flex-1">
            <PaymentToggle value={paymentMethod} onChange={setPaymentMethod} />
          </div>
          <button
            onClick={handleSubmit}
            disabled={orderLines.length === 0 || isSubmitting}
            className="flex-shrink-0 px-4 py-2.5 rounded-lg font-bold text-black bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : totalItems > 0 ? `Order (${totalItems}) · ${formatCurrency(total)}` : 'Select items'}
          </button>
        </div>
        <div className="h-20 lg:hidden" />

        {/* Desktop sidebar */}
        <div className="hidden lg:block bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
          <h3 className="text-white font-semibold">Order</h3>

          {submitError && (
            <p className="text-red-400 text-sm">{submitError}</p>
          )}

          {orderLines.length === 0 ? (
            <p className="text-gray-500 text-sm">Tap an item to add it</p>
          ) : (
            <ul className="space-y-2">
              {orderLines.map(line => {
                const summary = shortCustomizationSummary(line);
                return (
                  <li key={line.lineId} className="flex gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-white">{line.quantity}× {line.menuItem.name}</p>
                      {summary && <p className="text-gray-500 text-xs truncate">{summary}</p>}
                    </div>
                    <div className="flex items-start gap-1 flex-shrink-0">
                      <span className="text-gray-400">{formatCurrency(line.unitPrice * line.quantity)}</span>
                      <button onClick={() => removeLine(line.lineId)} className="text-gray-600 hover:text-red-400 transition-colors">
                        <X className="h-3 w-3" />
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
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold disabled:opacity-40"
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
    <div className="flex rounded-lg overflow-hidden border border-gray-700">
      {(['CASH', 'CARD_READER'] as PaymentMethod[]).map(method => (
        <button
          key={method}
          onClick={() => onChange(method)}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${value === method ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          {method === 'CASH' ? 'Cash' : 'Card Reader'}
        </button>
      ))}
    </div>
  );
}
