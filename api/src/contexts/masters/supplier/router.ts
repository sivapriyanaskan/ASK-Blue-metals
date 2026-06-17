import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth, requirePermissions } from '../../iam/auth.middleware.js';
import { Permissions } from '../../iam/permissions.js';
import { actorContextFromRequest } from '../_common.js';
import {
  CreateSupplierSchema,
  ListSuppliersQuerySchema,
  UpdateSupplierSchema,
  VehicleUpsertSchema,
} from './schema.js';
import { supplierService } from './service.js';

const router = Router();
router.use(requireAuth);

const IdParam = z.object({ id: z.string().min(1) });
const VehicleParam = z.object({ id: z.string().min(1), vehicleId: z.string().min(1) });

router.get(
  '/',
  requirePermissions(Permissions.SUPPLIER_VIEW),
  validate('query', ListSuppliersQuerySchema),
  asyncHandler(async (req, res) => {
    res.json(await supplierService.list(req.query as never));
  }),
);

router.get(
  '/:id',
  requirePermissions(Permissions.SUPPLIER_VIEW),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    res.json(await supplierService.getById((req.params as { id: string }).id));
  }),
);

router.post(
  '/',
  requirePermissions(Permissions.SUPPLIER_CREATE),
  validate('body', CreateSupplierSchema),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    res.status(201).json(await supplierService.create(req.body as never, ctx));
  }),
);

router.patch(
  '/:id',
  requirePermissions(Permissions.SUPPLIER_EDIT),
  validate('params', IdParam),
  validate('body', UpdateSupplierSchema),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id } = req.params as { id: string };
    res.json(await supplierService.update(id, req.body as never, ctx));
  }),
);

router.delete(
  '/:id',
  requirePermissions(Permissions.SUPPLIER_DELETE),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    await supplierService.deactivate((req.params as { id: string }).id, ctx);
    res.status(204).send();
  }),
);

router.get(
  '/:id/vehicles',
  requirePermissions(Permissions.SUPPLIER_VIEW),
  validate('params', IdParam),
  asyncHandler(async (req, res) => {
    res.json(await supplierService.listVehicles((req.params as { id: string }).id));
  }),
);

router.post(
  '/:id/vehicles',
  requirePermissions(Permissions.SUPPLIER_EDIT),
  validate('params', IdParam),
  validate('body', VehicleUpsertSchema),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id } = req.params as { id: string };
    res.status(201).json(await supplierService.addVehicle(id, req.body as never, ctx));
  }),
);

router.delete(
  '/:id/vehicles/:vehicleId',
  requirePermissions(Permissions.SUPPLIER_EDIT),
  validate('params', VehicleParam),
  asyncHandler(async (req, res) => {
    const ctx = actorContextFromRequest(req);
    const { id, vehicleId } = req.params as { id: string; vehicleId: string };
    await supplierService.removeVehicle(id, vehicleId, ctx);
    res.status(204).send();
  }),
);

export const supplierRouter = router;
