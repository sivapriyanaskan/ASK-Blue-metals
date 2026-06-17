import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth, requirePermissions } from '../../iam/auth.middleware.js';
import { Permissions } from '../../iam/permissions.js';
import { actorContextFromRequest } from '../_common.js';
import {
  CreateCustomerSchema,
  ListCustomersQuerySchema,
  UpdateCustomerSchema,
  VehicleUpsertSchema,
} from './schema.js';
import { customerService } from './service.js';

const router = Router();
router.use(requireAuth);

const IdParam = z.object({ id: z.string().min(1) });
const VehicleParam = z.object({ id: z.string().min(1), vehicleId: z.string().min(1) });

router.get(
  '/',
  requirePermissions(Permissions.CUSTOMER_VIEW),
  validate('query', ListCustomersQuerySchema),
  asyncHandler(async (req, res) => {
    res.json(await customerService.list(req.query as never));
  }),
);

router.get(
  '/:id',
  requirePermissions(Permissions.CUSTOMER_VIEW),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    res.json(await customerService.getById((req.params as { id: string }).id));
  }),
);

router.post(
  '/',
  requirePermissions(Permissions.CUSTOMER_CREATE),
  validate('body', CreateCustomerSchema),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const created = await customerService.create(req.body as never, ctx);
    res.status(201).json(created);
  }),
);

router.patch(
  '/:id',
  requirePermissions(Permissions.CUSTOMER_EDIT),
  validate('params', IdParam),
  validate('body', UpdateCustomerSchema),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id } = req.params as { id: string };
    res.json(await customerService.update(id, req.body as never, ctx));
  }),
);

router.delete(
  '/:id',
  requirePermissions(Permissions.CUSTOMER_DELETE),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    await customerService.deactivate((req.params as { id: string }).id, ctx);
    res.status(204).send();
  }),
);

// --- Nested vehicles ---

router.get(
  '/:id/vehicles',
  requirePermissions(Permissions.CUSTOMER_VIEW),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    res.json(await customerService.listVehicles((req.params as { id: string }).id));
  }),
);

router.post(
  '/:id/vehicles',
  requirePermissions(Permissions.CUSTOMER_EDIT),
  validate('params', IdParam),
  validate('body', VehicleUpsertSchema),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id } = req.params as { id: string };
    const created = await customerService.addVehicle(id, req.body as never, ctx);
    res.status(201).json(created);
  }),
);

router.delete(
  '/:id/vehicles/:vehicleId',
  requirePermissions(Permissions.CUSTOMER_EDIT),
  validate('params', VehicleParam),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id, vehicleId } = req.params as { id: string; vehicleId: string };
    await customerService.removeVehicle(id, vehicleId, ctx);
    res.status(204).send();
  }),
);

export const customerRouter = router;
