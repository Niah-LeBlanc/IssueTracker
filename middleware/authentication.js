//|====================================================================================================|
//|-------------------------------------------[ IMPORTS ]----------------------------------------------|
//|====================================================================================================|
import {auth} from "../auth.js";
import { getByField } from "../database.js";
//|====================================================================================================|
//|-------------------------------------------[ FUNCTIONS ]--------------------------------------------|
//|====================================================================================================|
//|==================================================|
//|--------------------[-FETCH-SESSION-]-------------|
//|==================================================|
export async function fetchSession(req) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            throw new Error("No session found");
        }
        return session;
    } catch (err) {
        throw new Error("Invalid or expired session");
    }
}
//|==================================================|
//|--------------------[-ATTACH-SESSION-]------------|
//|==================================================|
export async function attachSession(req, res, next) {
  try {
    if (!req.session) {
      const session = await fetchSession(req);
      req.user = {
        ...session.user,
      };
      req.role = session.role;
      req.session = session.session;
    }
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message
    });
  }
};
//|==================================================|
//|-----------------[-IS-AUTHENTICATED-]-------------|
//|==================================================|
export function isAuthenticated(req, res, next) {
    if (!req.session || !req.user) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in'
        });
    };
    next();
};
//|==================================================|
//|-----------------[-HAS-ANY-ROLE-]-----------------|
//|==================================================|
export function hasAnyRole() {
  return (req, res, next) => {
    if (!req.session || !req.user) {
      return res.status(401).json({ error: 'You are not logged in!' });
    };
    if (!req.role) {
      return res.status(403).json({ error: 'You do not have a role assigned!' });
    };
    next();
  };
};
//|==================================================|
//|-------------------[-HAS-ROLE-]-------------------|
//|==================================================|
export function hasRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.session || !req.user) {
      return res.status(401).json({ error: 'You are not logged in!' });
    };
    const userRoles = Array.isArray(req.user.role) ? req.user.role : [];
    if (userRoles.length === 0) {
      return res.status(403).json({ error: 'You do not have a role assigned!' });
    };
    const hasAllowedRole = userRoles.some(role => allowedRoles.includes(role));
    if (!hasAllowedRole) {
      return res.status(403).json({ error: 'You do not have permission to access this resource!' });
    };
    next();
  };
};
//|==================================================|
//|-----------------[-HAS-PERMISSION-]---------------|
//|==================================================|
export function hasPermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const userRoles = Array.isArray(req.user.role) ? req.user.role : [];
      if (userRoles.length === 0) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'User has no assigned roles',
        });
      }
      const roles = await getByField("role", "role", userRoles);
      const hasPerm = roles.some(
        (r) => r.permissions && r.permissions[permissionKey] === true
      );
      if (!hasPerm) {
        return res.status(403).json({
          error: 'Access denied',
          message: `You lack permission: ${permissionKey}`,
        });
      }
      next();
    } catch (err) {
      console.error('Permission check failed:', err);
      return res.status(500).json({
        error: 'Server error',
        message: 'An error occurred while checking permissions',
      });
    }
  };
}
