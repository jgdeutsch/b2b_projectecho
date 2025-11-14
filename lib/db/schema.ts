import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const linkedinPosts = pgTable('linkedin_posts', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  postUrl: text('post_url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const linkedinProfiles = pgTable('linkedin_profiles', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').references(() => linkedinPosts.id, { onDelete: 'cascade' }).notNull(),
  profileUrl: text('profile_url').notNull(),
  name: text('name'),
  headline: text('headline'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  linkedinPosts: many(linkedinPosts),
}));

export const linkedinPostsRelations = relations(linkedinPosts, ({ one, many }) => ({
  project: one(projects, {
    fields: [linkedinPosts.projectId],
    references: [projects.id],
  }),
  linkedinProfiles: many(linkedinProfiles),
}));

export const linkedinProfilesRelations = relations(linkedinProfiles, ({ one }) => ({
  post: one(linkedinPosts, {
    fields: [linkedinProfiles.postId],
    references: [linkedinPosts.id],
  }),
}));

