import { relations, sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth-schema'

export const wardrobeItems = sqliteTable(
  'wardrobe_items',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category').notNull(),
    subcategory: text('subcategory'),
    color: text('color'),
    description: text('description'),
    occasion: text('occasion'),
    season: text('season'),
    status: text('status').notNull().default('owned'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('wardrobe_items_user_id_idx').on(table.userId),
    index('wardrobe_items_user_category_idx').on(table.userId, table.category),
    index('wardrobe_items_user_status_idx').on(table.userId, table.status),
  ],
)

export const wardrobeItemMedia = sqliteTable(
  'wardrobe_item_media',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id')
      .notNull()
      .references(() => wardrobeItems.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['cutout'] }).notNull().default('cutout'),
    objectKey: text('object_key').notNull().unique(),
    contentType: text('content_type').notNull().default('image/webp'),
    byteSize: integer('byte_size').notNull(),
    width: integer('width'),
    height: integer('height'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index('wardrobe_item_media_item_id_idx').on(table.itemId),
    index('wardrobe_item_media_user_id_idx').on(table.userId),
  ],
)

export const outfits = sqliteTable(
  'outfits',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category'),
    source: text('source'),
    description: text('description'),
    stylingFormula: text('styling_formula'),
    occasion: text('occasion'),
    season: text('season'),
    status: text('status').notNull().default('draft'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('outfits_user_id_idx').on(table.userId),
    index('outfits_user_status_idx').on(table.userId, table.status),
  ],
)

export const outfitItems = sqliteTable(
  'outfit_items',
  {
    id: text('id').primaryKey(),
    outfitId: text('outfit_id')
      .notNull()
      .references(() => outfits.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => wardrobeItems.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', {
      enum: ['top', 'bottom', 'outerwear', 'shoes', 'bag', 'belt', 'accessories'],
    }).notNull(),
    x: real('x'),
    y: real('y'),
    scale: real('scale').notNull().default(1),
    rotation: real('rotation').notNull().default(0),
    zIndex: integer('z_index').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index('outfit_items_outfit_id_idx').on(table.outfitId),
    index('outfit_items_item_id_idx').on(table.itemId),
    index('outfit_items_user_id_idx').on(table.userId),
    index('outfit_items_outfit_z_index_idx').on(table.outfitId, table.zIndex),
    uniqueIndex('outfit_items_outfit_item_unique').on(table.outfitId, table.itemId),
  ],
)

export const packingPlans = sqliteTable(
  'packing_plans',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    plan: text('plan').notNull(),
    startDate: text('start_date'),
    endDate: text('end_date'),
    status: text('status', { enum: ['planning', 'packed'] }).notNull().default('planning'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('packing_plans_user_id_idx').on(table.userId),
    index('packing_plans_user_status_idx').on(table.userId, table.status),
    index('packing_plans_user_plan_idx').on(table.userId, table.plan),
  ],
)

export const packingPlanOutfits = sqliteTable(
  'packing_plan_outfits',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id')
      .notNull()
      .references(() => packingPlans.id, { onDelete: 'cascade' }),
    outfitId: text('outfit_id')
      .notNull()
      .references(() => outfits.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    packedAt: integer('packed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index('packing_plan_outfits_plan_id_idx').on(table.planId),
    index('packing_plan_outfits_outfit_id_idx').on(table.outfitId),
    index('packing_plan_outfits_user_id_idx').on(table.userId),
    uniqueIndex('packing_plan_outfits_plan_outfit_unique').on(table.planId, table.outfitId),
  ],
)

export const packingPlanItems = sqliteTable(
  'packing_plan_items',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id')
      .notNull()
      .references(() => packingPlans.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => wardrobeItems.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    packedAt: integer('packed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index('packing_plan_items_plan_id_idx').on(table.planId),
    index('packing_plan_items_item_id_idx').on(table.itemId),
    index('packing_plan_items_user_id_idx').on(table.userId),
    uniqueIndex('packing_plan_items_plan_item_unique').on(table.planId, table.itemId),
  ],
)

export const wardrobeItemRelations = relations(wardrobeItems, ({ many, one }) => ({
  media: many(wardrobeItemMedia),
  outfitItems: many(outfitItems),
  packingPlanItems: many(packingPlanItems),
  user: one(user, {
    fields: [wardrobeItems.userId],
    references: [user.id],
  }),
}))

export const wardrobeItemMediaRelations = relations(wardrobeItemMedia, ({ one }) => ({
  item: one(wardrobeItems, {
    fields: [wardrobeItemMedia.itemId],
    references: [wardrobeItems.id],
  }),
  user: one(user, {
    fields: [wardrobeItemMedia.userId],
    references: [user.id],
  }),
}))

export const outfitRelations = relations(outfits, ({ many, one }) => ({
  items: many(outfitItems),
  packingPlanOutfits: many(packingPlanOutfits),
  user: one(user, {
    fields: [outfits.userId],
    references: [user.id],
  }),
}))

export const outfitItemRelations = relations(outfitItems, ({ one }) => ({
  outfit: one(outfits, {
    fields: [outfitItems.outfitId],
    references: [outfits.id],
  }),
  item: one(wardrobeItems, {
    fields: [outfitItems.itemId],
    references: [wardrobeItems.id],
  }),
  user: one(user, {
    fields: [outfitItems.userId],
    references: [user.id],
  }),
}))

export const packingPlanRelations = relations(packingPlans, ({ many, one }) => ({
  outfits: many(packingPlanOutfits),
  items: many(packingPlanItems),
  user: one(user, {
    fields: [packingPlans.userId],
    references: [user.id],
  }),
}))

export const packingPlanOutfitRelations = relations(packingPlanOutfits, ({ one }) => ({
  plan: one(packingPlans, {
    fields: [packingPlanOutfits.planId],
    references: [packingPlans.id],
  }),
  outfit: one(outfits, {
    fields: [packingPlanOutfits.outfitId],
    references: [outfits.id],
  }),
  user: one(user, {
    fields: [packingPlanOutfits.userId],
    references: [user.id],
  }),
}))

export const packingPlanItemRelations = relations(packingPlanItems, ({ one }) => ({
  plan: one(packingPlans, {
    fields: [packingPlanItems.planId],
    references: [packingPlans.id],
  }),
  item: one(wardrobeItems, {
    fields: [packingPlanItems.itemId],
    references: [wardrobeItems.id],
  }),
  user: one(user, {
    fields: [packingPlanItems.userId],
    references: [user.id],
  }),
}))
