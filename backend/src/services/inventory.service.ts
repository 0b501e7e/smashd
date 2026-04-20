import { Prisma, PrismaClient } from '@prisma/client';
import {
  InventoryAdjustmentData,
  InventoryItemData,
  InventoryItemWithUsage,
  RecipeIngredientInput,
  StockOverview
} from '../types/admin.types';

type DbClient = PrismaClient | Prisma.TransactionClient;

type ParsedCustomizations = {
  selected: Record<string, string[]>;
  removed: Set<string>;
};

export class InventoryService {
  constructor(private prisma: PrismaClient) { }

  private toInventoryView(item: {
    id: number;
    name: string;
    unit: string;
    currentQuantity: number;
    lowStockThreshold: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): InventoryItemWithUsage {
    return {
      ...item,
      isLowStock: item.currentQuantity <= item.lowStockThreshold
    };
  }

  private normalizeRecipeIngredients(ingredients: RecipeIngredientInput[]): RecipeIngredientInput[] {
    const merged = new Map<number, number>();

    for (const ingredient of ingredients) {
      const inventoryItemId = Number(ingredient.inventoryItemId);
      const quantity = Number(ingredient.quantity);

      if (!Number.isFinite(inventoryItemId) || inventoryItemId <= 0) {
        throw new Error('Each recipe ingredient must reference a valid inventory item');
      }

      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new Error('Recipe quantities must be zero or greater');
      }

      if (quantity === 0) {
        continue;
      }

      merged.set(inventoryItemId, (merged.get(inventoryItemId) ?? 0) + quantity);
    }

    return Array.from(merged.entries()).map(([inventoryItemId, quantity]) => ({
      inventoryItemId,
      quantity
    }));
  }

  private parseCustomizations(raw: Prisma.JsonValue | string | null): ParsedCustomizations {
    let source: any = raw;

    if (typeof raw === 'string') {
      try {
        source = JSON.parse(raw);
      } catch {
        source = {};
      }
    }

    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return { selected: {}, removed: new Set<string>() };
    }

    const selected: Record<string, string[]> = {};
    const selectedSource = source.selected && typeof source.selected === 'object' && !Array.isArray(source.selected)
      ? source.selected
      : {};

    for (const [categoryKey, names] of Object.entries(selectedSource)) {
      if (!Array.isArray(names)) continue;
      const normalizedNames = names.filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
      if (normalizedNames.length > 0) {
        selected[categoryKey.toLowerCase()] = normalizedNames;
      }
    }

    const removed = new Set<string>(
      Array.isArray(source.removed)
        ? source.removed.filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
        : []
    );

    return { selected, removed };
  }

  async getStockOverview(): Promise<StockOverview> {
    const [inventoryItems, menuItems, customizationCategories] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
      }),
      this.prisma.menuItem.findMany({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          category: true,
          isAvailable: true,
          inventoryItems: {
            include: {
              inventoryItem: {
                select: { id: true, name: true }
              }
            },
            orderBy: { inventoryItem: { name: 'asc' } }
          }
        }
      }),
      this.prisma.customizationCategory.findMany({
        orderBy: { name: 'asc' },
        include: {
          options: {
            orderBy: { name: 'asc' },
            include: {
              inventoryItems: {
                include: {
                  inventoryItem: {
                    select: { id: true, name: true }
                  }
                },
                orderBy: { inventoryItem: { name: 'asc' } }
              }
            }
          }
        }
      })
    ]);

    return {
      inventoryItems: inventoryItems.map(item => this.toInventoryView(item)),
      menuItems: menuItems.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        isAvailable: item.isAvailable,
        recipe: item.inventoryItems.map(link => ({
          inventoryItemId: link.inventoryItem.id,
          inventoryItemName: link.inventoryItem.name,
          quantity: link.quantity
        }))
      })),
      customizationCategories: customizationCategories.map(category => ({
        id: category.id,
        name: category.name,
        options: category.options.map(option => ({
          id: option.id,
          name: option.name,
          price: option.price,
          recipe: option.inventoryItems.map(link => ({
            inventoryItemId: link.inventoryItem.id,
            inventoryItemName: link.inventoryItem.name,
            quantity: link.quantity
          }))
        }))
      }))
    };
  }

  async createInventoryItem(data: InventoryItemData): Promise<InventoryItemWithUsage> {
    const name = data.name?.trim();
    if (!name) {
      throw new Error('Inventory item name is required');
    }

    const item = await this.prisma.inventoryItem.create({
      data: {
        name,
        unit: data.unit?.trim() || 'unit',
        currentQuantity: Number(data.currentQuantity ?? 0),
        lowStockThreshold: Number(data.lowStockThreshold ?? 0),
        isActive: data.isActive ?? true
      }
    });

    return this.toInventoryView(item);
  }

  async updateInventoryItem(id: number, data: InventoryItemData): Promise<InventoryItemWithUsage> {
    const existing = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Inventory item not found');
    }

    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name: data.name?.trim() || existing.name,
        unit: data.unit?.trim() || existing.unit,
        currentQuantity: data.currentQuantity ?? existing.currentQuantity,
        lowStockThreshold: data.lowStockThreshold ?? existing.lowStockThreshold,
        isActive: data.isActive ?? existing.isActive
      }
    });

    return this.toInventoryView(item);
  }

  async adjustInventoryItem(id: number, data: InventoryAdjustmentData): Promise<InventoryItemWithUsage> {
    const quantityDelta = Number(data.quantityDelta);
    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
      throw new Error('Adjustment quantity must be a non-zero number');
    }

    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Inventory item not found');
      }

      const nextQuantity = existing.currentQuantity + quantityDelta;
      if (nextQuantity < 0) {
        throw new Error(`Cannot reduce stock below zero for "${existing.name}"`);
      }

      const updated = await tx.inventoryItem.update({
        where: { id },
        data: { currentQuantity: nextQuantity }
      });

      await tx.stockMovement.create({
        data: {
          inventoryItemId: id,
          movementType: quantityDelta > 0 ? 'RESTOCK' : 'MANUAL_ADJUSTMENT',
          quantityDelta,
          quantityAfter: nextQuantity,
          note: data.note?.trim() || null
        }
      });

      return this.toInventoryView(updated);
    });
  }

  async setMenuItemRecipe(menuItemId: number, ingredients: RecipeIngredientInput[]): Promise<{ message: string }> {
    const normalized = this.normalizeRecipeIngredients(ingredients);

    const menuItem = await this.prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem) {
      throw new Error('Menu item not found');
    }

    const inventoryIds = normalized.map(ingredient => ingredient.inventoryItemId);
    if (inventoryIds.length > 0) {
      const count = await this.prisma.inventoryItem.count({
        where: { id: { in: inventoryIds } }
      });
      if (count !== inventoryIds.length) {
        throw new Error('One or more inventory items were not found');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.menuItemInventory.deleteMany({ where: { menuItemId } });

      if (normalized.length > 0) {
        await tx.menuItemInventory.createMany({
          data: normalized.map(ingredient => ({
            menuItemId,
            inventoryItemId: ingredient.inventoryItemId,
            quantity: ingredient.quantity
          }))
        });
      }
    });

    return { message: `Recipe saved for ${menuItem.name}` };
  }

  async setCustomizationOptionRecipe(optionId: number, ingredients: RecipeIngredientInput[]): Promise<{ message: string }> {
    const normalized = this.normalizeRecipeIngredients(ingredients);

    const option = await this.prisma.customizationOption.findUnique({ where: { id: optionId } });
    if (!option) {
      throw new Error('Customization option not found');
    }

    const inventoryIds = normalized.map(ingredient => ingredient.inventoryItemId);
    if (inventoryIds.length > 0) {
      const count = await this.prisma.inventoryItem.count({
        where: { id: { in: inventoryIds } }
      });
      if (count !== inventoryIds.length) {
        throw new Error('One or more inventory items were not found');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.customizationOptionInventory.deleteMany({ where: { customizationOptionId: optionId } });

      if (normalized.length > 0) {
        await tx.customizationOptionInventory.createMany({
          data: normalized.map(ingredient => ({
            customizationOptionId: optionId,
            inventoryItemId: ingredient.inventoryItemId,
            quantity: ingredient.quantity
          }))
        });
      }
    });

    return { message: `Recipe saved for ${option.name}` };
  }

  async depleteStockForOrder(orderId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.depleteStockForOrderTx(tx, orderId);
    });
  }

  async depleteStockForOrderTx(tx: DbClient, orderId: number): Promise<void> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                inventoryItems: {
                  include: { inventoryItem: true }
                },
                linkedCustomizationOptions: {
                  include: {
                    customizationOption: {
                      include: {
                        category: true,
                        inventoryItems: {
                          include: { inventoryItem: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.stockDeductedAt) {
      return;
    }

    const consumption = new Map<number, { name: string; quantity: number }>();

    for (const item of order.items) {
      const orderQuantity = item.quantity;

      for (const recipeLink of item.menuItem.inventoryItems) {
        const quantity = recipeLink.quantity * orderQuantity;
        const existing = consumption.get(recipeLink.inventoryItemId);
        consumption.set(recipeLink.inventoryItemId, {
          name: recipeLink.inventoryItem.name,
          quantity: (existing?.quantity ?? 0) + quantity
        });
      }

      const customizations = this.parseCustomizations(item.customizations as Prisma.JsonValue | string | null);

      for (const linkedOption of item.menuItem.linkedCustomizationOptions) {
        const option = linkedOption.customizationOption;
        const categoryKey = option.category.name.toLowerCase();
        const isSelected = customizations.selected[categoryKey]?.includes(option.name) ?? false;
        const shouldConsume = linkedOption.isDefault
          ? !customizations.removed.has(option.name)
          : isSelected;

        if (!shouldConsume) {
          continue;
        }

        for (const recipeLink of option.inventoryItems) {
          const quantity = recipeLink.quantity * orderQuantity;
          const existing = consumption.get(recipeLink.inventoryItemId);
          consumption.set(recipeLink.inventoryItemId, {
            name: recipeLink.inventoryItem.name,
            quantity: (existing?.quantity ?? 0) + quantity
          });
        }
      }
    }

    if (consumption.size === 0) {
      await tx.order.update({
        where: { id: orderId },
        data: { stockDeductedAt: new Date() }
      });
      return;
    }

    const inventoryIds = Array.from(consumption.keys());
    const inventoryItems = await tx.inventoryItem.findMany({
      where: { id: { in: inventoryIds } }
    });

    const inventoryMap = new Map(inventoryItems.map(item => [item.id, item]));
    const shortages: string[] = [];

    for (const [inventoryItemId, required] of consumption.entries()) {
      const inventoryItem = inventoryMap.get(inventoryItemId);
      if (!inventoryItem) {
        shortages.push(`${required.name} (missing inventory item)`);
        continue;
      }

      if (inventoryItem.currentQuantity < required.quantity) {
        shortages.push(`${required.name} (${inventoryItem.currentQuantity.toFixed(2)} ${inventoryItem.unit} available, ${required.quantity.toFixed(2)} needed)`);
      }
    }

    if (shortages.length > 0) {
      throw new Error(`Insufficient stock: ${shortages.join('; ')}`);
    }

    for (const [inventoryItemId, required] of consumption.entries()) {
      const inventoryItem = inventoryMap.get(inventoryItemId)!;
      const nextQuantity = inventoryItem.currentQuantity - required.quantity;

      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { currentQuantity: nextQuantity }
      });

      await tx.stockMovement.create({
        data: {
          inventoryItemId,
          orderId,
          movementType: 'ORDER_DEPLETION',
          quantityDelta: -required.quantity,
          quantityAfter: nextQuantity,
          note: `Order #${orderId}`
        }
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: { stockDeductedAt: new Date() }
    });
  }
}
