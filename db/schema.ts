import { pgTable, serial, text, integer, doublePrecision, timestamp } from 'drizzle-orm/pg-core'

export const places = pgTable('places', {
  id: serial().primaryKey(),
  osmId: text('osm_id').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull().default('place'),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const reels = pgTable('reels', {
  id: serial().primaryKey(),
  placeId: integer('place_id').notNull().references(() => places.id),
  url: text('url').notNull(),
  title: text('title').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
})

export const checkins = pgTable('checkins', {
  id: serial().primaryKey(),
  placeId: integer('place_id').notNull().references(() => places.id),
  userId: text('user_id').notNull(),
  photoBlobKey: text('photo_blob_key').notNull(),
  points: integer('points').notNull().default(50),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const aiImages = pgTable('ai_images', {
  id: serial().primaryKey(),
  placeId: integer('place_id').notNull().references(() => places.id),
  userId: text('user_id').notNull(),
  blobKey: text('blob_key').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
