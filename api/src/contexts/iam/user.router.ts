import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../infra/validation.js';
import { Errors } from '../../infra/errors.js';
import { requireAuth, requirePermissions } from './auth.middleware.js';
import { Permissions } from './permissions.js';
import { getRequestContext } from './types.js';
import {
  CreateUserSchema,
  ListUsersQuerySchema,
  UpdateUserSchema,
  userService,
} from './user.service.js';

const router = Router();

const IdParam = z.object({ id: z.string().min(1) });

router.use(requireAuth);

router.get(
  '/',
  requirePermissions(Permissions.USER_VIEW),
  validate('query', ListUsersQuerySchema),
  asyncHandler(async (req, res) => {
    const result = await userService.list(req.query as never);
    res.json(result);
  }),
);

router.get(
  '/:id',
  requirePermissions(Permissions.USER_VIEW),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const user = await userService.getById((req.params as { id: string }).id);
    res.json(user);
  }),
);

router.post(
  '/',
  requirePermissions(Permissions.USER_CREATE),
  validate('body', CreateUserSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw Errors.unauthorized();
    const ctx = {
      actorId: req.user.id,
      actorName: req.user.username,
      ...getRequestContext(req),
      requestId: req.id,
    };
    const user = await userService.create(req.body as never, ctx);
    res.status(201).json(user);
  }),
);

router.patch(
  '/:id',
  requirePermissions(Permissions.USER_EDIT),
  validate('params', IdParam),
  validate('body', UpdateUserSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw Errors.unauthorized();
    const ctx = {
      actorId: req.user.id,
      actorName: req.user.username,
      ...getRequestContext(req),
      requestId: req.id,
    };
    const user = await userService.update(
      (req.params as { id: string }).id,
      req.body as never,
      ctx,
    );
    res.json(user);
  }),
);

router.delete(
  '/:id',
  requirePermissions(Permissions.USER_DELETE),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    if (!req.user) throw Errors.unauthorized();
    const id = (req.params as { id: string }).id;
    if (id === req.user.id) throw Errors.badRequest('You cannot deactivate your own account');
    const ctx = {
      actorId: req.user.id,
      actorName: req.user.username,
      ...getRequestContext(req),
      requestId: req.id,
    };
    const user = await userService.deactivate(id, ctx);
    res.json(user);
  }),
);

export const userRouter = router;
