import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../../infra/validation.js';
import { requireAuth, requirePermissions } from '../../iam/auth.middleware.js';
import { Permissions } from '../../iam/permissions.js';
import { actorContextFromRequest } from '../_common.js';
import { prisma } from '../../../infra/db.js';
import {
  CreateSupplierSchema,
  ListSuppliersQuerySchema,
  UpdateSupplierSchema,
  VehicleUpsertSchema,
} from './schema.js';
import { supplierService } from './service.js';

const router = Router();
router.use(requireAuth);

const GST_STATE_INFO: Record<string, { state: string; city: string }> = {
  '01': { state: 'Jammu and Kashmir', city: 'Srinagar' },
  '02': { state: 'Himachal Pradesh', city: 'Shimla' },
  '03': { state: 'Punjab', city: 'Chandigarh' },
  '04': { state: 'Chandigarh', city: 'Chandigarh' },
  '05': { state: 'Uttarakhand', city: 'Dehradun' },
  '06': { state: 'Haryana', city: 'Chandigarh' },
  '07': { state: 'Delhi', city: 'New Delhi' },
  '08': { state: 'Rajasthan', city: 'Jaipur' },
  '09': { state: 'Uttar Pradesh', city: 'Lucknow' },
  '10': { state: 'Bihar', city: 'Patna' },
  '11': { state: 'Sikkim', city: 'Gangtok' },
  '12': { state: 'Arunachal Pradesh', city: 'Itanagar' },
  '13': { state: 'Nagaland', city: 'Kohima' },
  '14': { state: 'Manipur', city: 'Imphal' },
  '15': { state: 'Mizoram', city: 'Aizawl' },
  '16': { state: 'Tripura', city: 'Agartala' },
  '17': { state: 'Meghalaya', city: 'Shillong' },
  '18': { state: 'Assam', city: 'Dispur' },
  '19': { state: 'West Bengal', city: 'Kolkata' },
  '20': { state: 'Jharkhand', city: 'Ranchi' },
  '21': { state: 'Odisha', city: 'Bhubaneswar' },
  '22': { state: 'Chhattisgarh', city: 'Raipur' },
  '23': { state: 'Madhya Pradesh', city: 'Bhopal' },
  '24': { state: 'Gujarat', city: 'Gandhinagar' },
  '25': { state: 'Daman and Diu', city: 'Daman' },
  '26': { state: 'Dadra and Nagar Haveli and Daman and Diu', city: 'Silvassa' },
  '27': { state: 'Maharashtra', city: 'Mumbai' },
  '28': { state: 'Andhra Pradesh', city: 'Amaravati' },
  '29': { state: 'Karnataka', city: 'Bengaluru' },
  '30': { state: 'Goa', city: 'Panaji' },
  '31': { state: 'Lakshadweep', city: 'Kavaratti' },
  '32': { state: 'Kerala', city: 'Thiruvananthapuram' },
  '33': { state: 'Tamil Nadu', city: 'Chennai' },
  '34': { state: 'Puducherry', city: 'Puducherry' },
  '35': { state: 'Andaman and Nicobar Islands', city: 'Port Blair' },
  '36': { state: 'Telangana', city: 'Hyderabad' },
  '37': { state: 'Andhra Pradesh (New)', city: 'Amaravati' },
  '38': { state: 'Ladakh', city: 'Leh' },
};

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

const GstinParam = z.object({
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN'),
});
router.get(
  '/gst-lookup/:gstin',
  requirePermissions(Permissions.SUPPLIER_VIEW),
  validate('params', GstinParam),
  asyncHandler(async (req, res) => {
    const { gstin } = req.params as { gstin: string };
    const stateCode = gstin.slice(0, 2);
    const stateInfo = GST_STATE_INFO[stateCode] ?? { state: 'Unknown', city: 'Unknown' };
    const existing = await prisma.supplier.findFirst({
      where: { gstNumber: gstin },
      select: { name: true, address: true, isActive: true },
    });

    const area = `Ward-${gstin.slice(10, 13)}`;
    const inferredAddress = existing?.address || `${area}, ${stateInfo.city}, ${stateInfo.state}`;
    res.json({
      gstin,
      legalName: existing?.name || '',
      tradeName: existing?.name || '',
      address: inferredAddress,
      stateCode,
      state: stateInfo.state,
      city: stateInfo.city,
      area,
      status: existing?.isActive === false ? 'Inactive' : 'Active',
      source: existing ? 'existing-supplier+gstin-map' : 'gstin-map',
    });
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
