import { Router } from 'express';
import { authRouter } from './auth.router.js';
import { userRouter } from './user.router.js';
import { roleRouter } from './role.router.js';
import { menuRouter } from './menu.router.js';
import { featureRouter } from './feature.router.js';
import { roleAccessRouter } from './role-access.router.js';

export function mountIamRoutes(): {
  auth: Router;
  users: Router;
  roles: Router;
  menus: Router;
  features: Router;
  roleAccess: Router;
} {
  return {
    auth: authRouter,
    users: userRouter,
    roles: roleRouter,
    menus: menuRouter,
    features: featureRouter,
    roleAccess: roleAccessRouter,
  };
}
