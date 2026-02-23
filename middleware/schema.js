//|====================================================================================================|
//|------------------------------------------[-INITIALIZATION-]----------------------------------------|
//|====================================================================================================|
import Joi from "joi";
//|====================================================================================================|
//|-------------------------------------------[-USER-SCHEMA-]------------------------------------------|
//|====================================================================================================|
export const userListQuerySchema = Joi.object({
 role: Joi.string().optional(),
 maxAge:Joi.number().optional(),
 minAge:Joi.number().optional(),
 sortBy:Joi.string().optional().lowercase().valid(
  "givenName",
  "familyName",
  "role",
  "newest",
  "oldest"
 ) 
}).unknown(false);
export const userSchema = Joi.object({
  email: Joi.string().lowercase().trim().email().required(),
  password: Joi.string().trim().min(3).required(),
  givenName: Joi.string().lowercase().trim().min(1).required(),
  familyName: Joi.string().lowercase().trim().min(1).required(),
  role: Joi.string()
    .trim()
    .lowercase()
    .valid(
      'developer',
      'quality analyst',
      'business analyst',
      'product manager',
      'technical manager').required()
});
export const userPatchSchema = (allowRoleEdit = false) =>
  Joi.object({
    email: Joi.string().min(1).optional(),
    password: Joi.string().min(3).optional(),
    givenName: Joi.string().min(1).optional(),
    familyName: Joi.string().min(1).optional(),
    fullName: Joi.string().min(1).optional(),
    role: allowRoleEdit
      ? Joi.string()
          .valid(
            'developer',
            'quality analyst',
            'business analyst',
            'product manager',
            'technical manager'
          )
          .optional()
      : Joi.forbidden()
  }).min(1).required();
export const userLoginSchema = Joi.object({
  email: Joi.string().email().min(1).required(),
  password: Joi.string().min(3).required()
});
//|====================================================================================================|
//|-------------------------------------------[-BUGS-SCHEMA-]------------------------------------------|
//|====================================================================================================|
export const bugSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    stepsToReproduce: Joi.string().required()
});
export const bugListQuerySchema = Joi.object({
 role: Joi.string().optional(),
 maxAge:Joi.number().optional(),
 minAge:Joi.number().optional(),
 closed:Joi.number().optional().valid(
  true,
  false
 ),
 sortBy:Joi.string().optional().lowercase().valid(
  "newest",
  "oldest",
  "title",
  "classification",
  "assignedTo",
  "createdBy"
 ) 
}).unknown(false);
export const bugPatchSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  stepsToReproduce: Joi.string().optional()
}).min(1).required();
export const bugClassifySchema = Joi.object({
  classification: Joi.string().valid(
    'critical',
    'major',
    'minor',
    'trivial')
    .required()
});
export const bugAssignSchema = Joi.object({
  assignedToUserId: Joi.string().required()
});
export const bugCloseSchema = Joi.object({
  closed: Joi.boolean().required()
});
//|====================================================================================================|
//|------------------------------------------[-COMMENT-SCHEMA-]----------------------------------------|
//|====================================================================================================|
export const commentSchema = Joi.object({
  author: Joi.string().required(),
  commentText: Joi.string().required()
}).required();
//|====================================================================================================|
//|-------------------------------------------[-TEST-SCHEMA-]------------------------------------------|
//|====================================================================================================|
export const testSchema = Joi.object({
  description: Joi.string().required(),
  preconditions: Joi.string().required(),
  steps: Joi.string().required(),
  expectedResult: Joi.string().required(),
  actualResult: Joi.string().required()
}).required();
export const testPatchSchema = Joi.object({
  description: Joi.string().optional(),
  preconditions: Joi.string().optional(),
  steps: Joi.string().optional(),
  expectedResult: Joi.string().optional(),
  actualResult: Joi.string().optional()
}).min(1).required();
;