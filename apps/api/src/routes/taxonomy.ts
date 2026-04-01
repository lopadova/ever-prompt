import { Hono } from 'hono';
import type { Env } from '../env';
import { db } from '../lib/db';
import {
  createProjectSchema, updateProjectSchema,
  createCategorySchema, updateCategorySchema,
  createTagSchema, updateTagSchema, mergeTagsSchema,
} from '@everprompt/shared';
import {
  listProjects, createProject, updateProject, deleteProject,
  listCategories, getCategoryTree, createCategory, updateCategory, deleteCategory,
  listTags, createTag, updateTag, deleteTag, mergeTags,
} from '../services/taxonomy.service';

export const taxonomyRoutes = new Hono<Env>();

// ---- Projects ----

taxonomyRoutes.get('/projects', async (c) => {
  const d = db(c.env.DB);
  const data = await listProjects(d);
  return c.json({ ok: true, data });
});

taxonomyRoutes.post('/projects', async (c) => {
  const body = await c.req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }
  const d = db(c.env.DB);
  const data = await createProject(d, parsed.data);
  return c.json({ ok: true, data }, 201);
});

taxonomyRoutes.patch('/projects/:id', async (c) => {
  const body = await c.req.json();
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }
  const d = db(c.env.DB);
  const data = await updateProject(d, c.req.param('id'), parsed.data);
  if (!data) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
  }
  return c.json({ ok: true, data });
});

taxonomyRoutes.delete('/projects/:id', async (c) => {
  const d = db(c.env.DB);
  try {
    const result = await deleteProject(d, c.req.param('id'));
    if (!result) {
      return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404);
    }
    return c.json({ ok: true, data: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Delete failed';
    return c.json({ ok: false, error: { code: 'CONFLICT', message } }, 409);
  }
});

// ---- Categories ----

taxonomyRoutes.get('/categories', async (c) => {
  const d = db(c.env.DB);
  const data = await listCategories(d);
  return c.json({ ok: true, data });
});

taxonomyRoutes.get('/categories/tree', async (c) => {
  const d = db(c.env.DB);
  const data = await getCategoryTree(d);
  return c.json({ ok: true, data });
});

taxonomyRoutes.post('/categories', async (c) => {
  const body = await c.req.json();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }
  const d = db(c.env.DB);
  const data = await createCategory(d, parsed.data);
  return c.json({ ok: true, data }, 201);
});

taxonomyRoutes.patch('/categories/:id', async (c) => {
  const body = await c.req.json();
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }
  const d = db(c.env.DB);
  const data = await updateCategory(d, c.req.param('id'), parsed.data);
  if (!data) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404);
  }
  return c.json({ ok: true, data });
});

taxonomyRoutes.delete('/categories/:id', async (c) => {
  const d = db(c.env.DB);
  const result = await deleteCategory(d, c.req.param('id'));
  if (!result) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404);
  }
  return c.json({ ok: true, data: result });
});

// ---- Tags ----

taxonomyRoutes.get('/tags', async (c) => {
  const d = db(c.env.DB);
  const data = await listTags(d);
  return c.json({ ok: true, data });
});

taxonomyRoutes.post('/tags', async (c) => {
  const body = await c.req.json();
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }
  const d = db(c.env.DB);
  const data = await createTag(d, parsed.data);
  return c.json({ ok: true, data }, 201);
});

taxonomyRoutes.patch('/tags/:id', async (c) => {
  const body = await c.req.json();
  const parsed = updateTagSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }
  const d = db(c.env.DB);
  const data = await updateTag(d, c.req.param('id'), parsed.data);
  if (!data) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } }, 404);
  }
  return c.json({ ok: true, data });
});

taxonomyRoutes.delete('/tags/:id', async (c) => {
  const d = db(c.env.DB);
  const result = await deleteTag(d, c.req.param('id'));
  if (!result) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } }, 404);
  }
  return c.json({ ok: true, data: result });
});

taxonomyRoutes.post('/tags/merge', async (c) => {
  const body = await c.req.json();
  const parsed = mergeTagsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }
  const d = db(c.env.DB);
  const result = await mergeTags(d, parsed.data.source_tag_id, parsed.data.target_tag_id);
  if (!result) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'One or both tags not found' } }, 404);
  }
  return c.json({ ok: true, data: result });
});
