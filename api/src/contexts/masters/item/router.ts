import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth, requirePermissions } from '../../iam/auth.middleware.js';
import { Permissions } from '../../iam/permissions.js';
import { actorContextFromRequest } from '../_common.js';
import { CreateItemSchema, ListItemsQuerySchema, UpdateItemSchema } from './schema.js';
import { itemService } from './service.js';

const router = Router();
router.use(requireAuth);
const IdParam = z.object({ id: z.string().min(1) });

router.get(
  '/',
  requirePermissions(Permissions.ITEM_VIEW),
  validate('query', ListItemsQuerySchema),
  asyncHandler(async (req, res) => {
    res.json(await itemService.list(req.query as never));
  }),
);

router.get(
  '/:id',
  requirePermissions(Permissions.ITEM_VIEW),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    res.json(await itemService.getById((req.params as { id: string }).id));
  }),
);

router.post(
  '/',
  requirePermissions(Permissions.ITEM_CREATE),
  validate('body', CreateItemSchema),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    res.status(201).json(await itemService.create(req.body as never, ctx));
  }),
);

router.patch(
  '/:id',
  requirePermissions(Permissions.ITEM_EDIT),
  validate('params', IdParam),
  validate('body', UpdateItemSchema),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    res.json(await itemService.update((req.params as { id: string }).id, req.body as never, ctx));
  }),
);

router.delete(
  '/:id',
  requirePermissions(Permissions.ITEM_DELETE),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    await itemService.deactivate((req.params as { id: string }).id, ctx);
    res.status(204).send();
  }),
);

export const itemRouter = router;
