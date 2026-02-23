//|==================================================|
//|-------------------[-IMPORTS-]--------------------|
//|==================================================|
import { ObjectId } from "mongodb";
//|==================================================|
//|-------------------[-Valid-Id-]-------------------|
//|==================================================|
export const validId = (paramName) => {
    return (req, res, next) => {
        try {
            req.params[paramName] = new ObjectId(req.params[paramName]);
            return next();
        } catch (err) {
            return res.status(422).json({
                error: `${paramName} was not a valid ObjectId`
            });
        };
    };
};
//|==================================================|
//|-------------------[-Valid-Body-]-----------------|
//|==================================================|
export const validBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true, 
    });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => detail.message),
      });
    };
    req.body = value;
    next();
  };
};
//|==================================================|
//|[----------------[-VALIDATE-QUERY-]---------------|
//|==================================================|
export const validQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: false,
    });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => detail.message),
      });
    };
    req.validatedQuery = value;
    next();
  };
};
