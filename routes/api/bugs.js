//|====================================================================================================|
//|-------------------------------------------[-IMPORTS-]----------------------------------------------|
//|====================================================================================================|
//|==================================================|
//|---------------------[-SCHEMA-]-------------------|
//|==================================================|
import { bugSchema,
 bugPatchSchema,
 bugClassifySchema,
 bugAssignSchema,
 bugCloseSchema,
 bugListQuerySchema} 
 from '../../middleware/schema.js';
//|==================================================|
//|-------------------[-DATABASE-]-------------------|
//|==================================================|
import { listAll,
 getByField,
 assignBugToUser,
 insertNew,
 updateBug} 
 from '../../database.js'; 
//|==================================================|
//|------------------[-VALIDATION-]------------------|
//|==================================================|
import { validId,
 validBody,
 validQuery} 
 from '../../middleware/validation.js';
//|==================================================|
//|-----------------[-AUTHENTICATION-]---------------|
//|==================================================|
import { attachSession,
 hasPermission,
 isAuthenticated 
} from '../../middleware/authentication.js';
//|==================================================|
//|-----------------[-EXPRESS & DEBUG-]--------------|
//|==================================================|
import express from 'express';
import debug from 'debug';
//|====================================================================================================|
//|---------------------------------------[-MIDDLEWARE-INITIALIZATION-]--------------------------------|
//|====================================================================================================|
const router = express.Router();
const debugBug = debug('app:BugRouter');
router.use(express.urlencoded({ extended: false }));
router.use(express.json());
//|====================================================================================================|
//|-------------------------------------------[-GET-REQUESTS-]-----------------------------------------|
//|====================================================================================================|
//|==================================================|
//|-----------------[-GET-ALL-BUGS-]-----------------|
//|==================================================|
router.get('',
 attachSession,
 isAuthenticated,
 hasPermission("canViewData"),
 validQuery(bugListQuerySchema),
 async (req, res) => {
  try {
    const query = req.query;
    const foundData = await listAll('bug', query);
    debugBug(`Success: (GET: bugs)`);
    return res.status(200).json([foundData]);
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }
    else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to list bugs' });
    }
  };
});
//|==================================================|
//|-----------------[-GET-BUG-BY-ID-]----------------|
//|==================================================|
router.get('/:bugId',
 attachSession,
 isAuthenticated,
 hasPermission("canViewData"),
 validId('bugId'),
 async (req, res) => {
  const { bugId } = req.params;
  try {
    const bug = await getByField('bug', '_id', bugId) 
    if (!bug) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    };
    debugBug(`Success: (GET/:bugId: ${bugId})`);
    return res.status(200).json(bug);
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to get bug' });
    };
  };
});
//|====================================================================================================|
//|-------------------------------------------[-POST-REQUESTS-]----------------------------------------|
//|====================================================================================================|
//|==================================================|
//|-----------------[-POST-CREATE-BUG-]--------------|
//|==================================================|
router.post('',
 attachSession,
 isAuthenticated,
 hasPermission("canViewData"),
 validBody(bugSchema),
 async (req, res) => {
  try {
    const newBug = {
      ...req.body,
      createdOn: new Date(),
      createdBy: req.user.email,
      classification: "unclassified",
      closed: false
    };
    // Insert new bug and get its ID directly
    const result = await insertNew('bug', newBug);
    // Assume result.insertedId contains the new bug's ID
    const bugId = result.insertedId || newBug._id; // fallback in case insertNew returns the full object
    // Log the edit
    const newEdit = {
      timestamp: new Date(),
      col: "bug",
      op: "insert",
      target: { _id: bugId },
      update: "bug",
      performedBy: req.user.email
    };
    await insertNew('edits', newEdit);
    res.status(201).json({ message: "Bug created successfully", bug: { ...newBug, _id: bugId } });
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to create bug' });
    };
  };
});
//|====================================================================================================|
//|-------------------------------------------[-PATCH-REQUESTS-]---------------------------------------|
//|====================================================================================================|
//|==================================================|
//|-----------------[-PATCH UPDATE BUG-]-------------|
//|==================================================|
router.patch('/:bugId',
 attachSession,
 isAuthenticated,
 validId('bugId'),
 hasPermission(
  "canViewData",
  "canEditIfAssignedTo",
  "canEditMyBug"
 ),
 validBody(bugPatchSchema),
 async (req, res) => {
  try {
    const { bugId } = req.params;
    const updatedInfo = req.body;
    await updateBug(bugId, updatedInfo)
    debugBug(`Success: (PATCH/bugId: ${bugId})`);
    return res.status(200).json({ message: `Bug ${bugId} updated.` });
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to update bug' });
    };
  };
});
//|==================================================|
//|---------------[-PATCH-CLASSIFY-BUG-]-------------|
//|==================================================|
router.patch('/:bugId/classify',
 attachSession,
 isAuthenticated,
 validId('bugId'),
 hasPermission(
 "canViewData",
 "canEditIfAssignedTo",
 "canEditMyBug"),
 validBody(bugClassifySchema),
 async (req, res) => {
  try {
    const { bugId } = req.params;
    const updatedInfo = req.body;
    await updateBug(bugId, updatedInfo)
    debugBug(`Success: (PATCH/bugId/classify: ${bugId})`);
    return res.status(200).json({ 
      message: `Bug ${bugId} classified as ${updatedInfo.classification}.` 
    });
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to classify bug' });
    };
  };
});
//|==================================================|
//|-----------------[-PATCH ASSIGN BUG-]-------------|
//|==================================================|
router.patch('/:bugId/assign',
 attachSession,
 isAuthenticated,
 validId('bugId'),
 hasPermission(
  "canReassignAnyBug",
  "canReassignIfAssignedTo",
  "canEditMyBug"
 ),
 validBody(bugAssignSchema),
 async (req, res) => {
  try {
    const { bugId } = req.params;
    const assignedToUserId = req.body;
    const userId  = validId(Object.values(assignedToUserId)[0]);
    const user = await getByField('users', '_id', userId)
    await assignBugToUser(userId, bugId)
    debugBug(`Success: (PATCH/bugId/assign: ${bugId})`);
    return res.status(200).json({ message: `Bug ${bugId} assigned to ${user.fullName}` });
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to assign bug' });
    };
  };
});
//|==================================================|
//|-----------------[-PATCH CLOSE BUG-]--------------|
//|==================================================|
router.patch('/:bugId/close',
 attachSession,
 isAuthenticated,
 hasPermission("canCloseAnyBug"),
 validId("bugId"),
 validBody(bugCloseSchema),
 async (req, res) => {
  try {
    const { bugId } = req.params;
    const updatedInfo = req.body;
    const result = await updateBug(bugId, updatedInfo);
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: `Bug ${bugId} not found.` });
    };
    if(updatedInfo.closed == true){
      debugBug(`Success: (PATCH/bugId/close: ${bugId})`);
      return res.status(200).json({ message: `Bug ${bugId} is now closed.` });
    }
    else{
      return res.status(200).json({ message: `Bug ${bugId} is now open.` });
    };
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }
    else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to close/open bug' });
    };
  };
});
//|====================================================================================================|
//|-------------------------------------------[ FUNCTIONS ]--------------------------------------------|
//|====================================================================================================|
function autoCatch(err, res){
    console.error(err);
    return res.status(err.status).json({ error: err.message });
};
//|====================================================================================================|
//|-------------------------------------------[ EXPORT ROUTER ]----------------------------------------|
//|====================================================================================================|
export { router as bugRouter };