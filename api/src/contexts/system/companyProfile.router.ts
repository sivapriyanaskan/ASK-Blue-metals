import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../infra/db.js';
import { asyncHandler, validate } from '../../infra/validation.js';
import { requireAuth, requirePermissions } from '../iam/auth.middleware.js';
import { Permissions } from '../iam/permissions.js';

/**
 * Company profile (singleton row, id = 'singleton').
 *
 * Used to render the company header on Tax Invoice / Weight Slip / Estimate
 * print templates (#10, #27). The row is seeded once and can be updated by
 * an admin via the System Settings UI.
 */

const router = Router();
router.use(requireAuth);

const UpdateBody = z.object({
  name: z.string().min(1).max(160),
  address: z.string().max(500).optional().nullable(),
  gstin: z.string().max(32).optional().nullable(),
  panNumber: z.string().max(32).optional().nullable(),
  msmeNumber: z.string().max(64).optional().nullable(),
  cin: z.string().max(32).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(254).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  bankName: z.string().max(120).optional().nullable(),
  accountNumber: z.string().max(64).optional().nullable(),
  ifscCode: z.string().max(32).optional().nullable(),
  upiId: z.string().max(120).optional().nullable(),
});

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const row = await prisma.companyProfile.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton', name: 'ASK Blue Metal' },
    });
    res.json(row);
  }),
);

router.put(
  '/',
  requirePermissions(Permissions.SYSTEM_SETTINGS_MANAGE),
  validate('body', UpdateBody),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof UpdateBody>;
    const row = await prisma.companyProfile.upsert({
      where: { id: 'singleton' },
      update: {
        name: body.name,
        address: body.address ?? null,
        gstin: body.gstin ?? null,
        panNumber: body.panNumber ?? null,
        msmeNumber: body.msmeNumber ?? null,
        cin: body.cin ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        logoUrl: body.logoUrl ?? null,
        bankName: body.bankName ?? null,
        accountNumber: body.accountNumber ?? null,
        ifscCode: body.ifscCode ?? null,
        upiId: body.upiId ?? null,
      },
      create: {
        id: 'singleton',
        name: body.name,
        address: body.address ?? null,
        gstin: body.gstin ?? null,
        panNumber: body.panNumber ?? null,
        msmeNumber: body.msmeNumber ?? null,
        cin: body.cin ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        logoUrl: body.logoUrl ?? null,
        bankName: body.bankName ?? null,
        accountNumber: body.accountNumber ?? null,
        ifscCode: body.ifscCode ?? null,
        upiId: body.upiId ?? null,
      },
    });
    res.json(row);
  }),
);

export const companyProfileRouter = router;
