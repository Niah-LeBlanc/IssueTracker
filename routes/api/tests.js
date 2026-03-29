//|====================================================================================================|
//|-------------------------------------------[-IMPORTS-]----------------------------------------------|
//|====================================================================================================|
//|==================================================|
//|---------------------[-SCHEMA-]-------------------|
//|==================================================|
import { testSchema,
 testPatchSchema } 
 from '../../middleware/schema.js';
//|==================================================|
//|-------------------[-DATABASE-]-------------------|
//|==================================================|
import { getByField,
 getNestedItem,
 insertIntoDocument,
 updateNestedItem,
 deleteNestedItem } 
 from '../../database.js';
//|==================================================|
//|------------------[-VALIDATION-]------------------|
//|==================================================|
import { validId,
 validBody } 
 from '../../middleware/validation.js';
//|==================================================|
//|-----------------[-AUTHENTICATION-]---------------|
//|==================================================|
import { attachSession,
 hasPermission,
 isAuthenticated } 
 from '../../middleware/authentication.js';
//|==================================================|
//|-----------------[-EXPRESS & DEBUG-]--------------|
//|==================================================|
import express from 'express';
import debug from 'debug';
//|====================================================================================================|
//|-------------------------------------------[-MIDDLEWARE-]--------------------------------------------|
//|====================================================================================================|
const router = express.Router();
const debugTests = debug('app:TestAPI');
router.use(express.urlencoded({ extended: false }));
router.use(express.json());
//|========================================================================================|
//|---------------------------------------[-GET-REQUESTS-]---------------------------------|
//|========================================================================================|
//|============================================|
//|------[-GET-ALL-TEST-CASES-FOR-A-BUG-]------|
//|============================================|
router.get('/:bugId/tests',
 attachSession,
 isAuthenticated,
 hasPermission("canViewData"),
 validId('bugId'),
 async (req, res) => {
  debugTests(`GET /:bugId/tests hit`);
  try {
    const { bugId } = req.params;
    const bugData = await getByField('bugs', '_id', bugId);
    if (!bugData.testCases || bugData.testCases.length === 0) {
      return res.status(404).json({ error: `Bug ${bugId} has no test cases.` });
    };
    return res.status(200).json(bugData.testCases);
  } catch (err) {
    if (err.status) {
      autoCatch(err, res);
    } else {
      console.error(err);
      return res.status(500).json({ error: 'Failed to GET test cases' });
    };
  };
});
//|============================================|
//|----[-GET-SPECIFIC-TEST-CASE-FOR-A-BUG-]----|
//|============================================|
router.get('/:bugId/tests/:testId',
 attachSession,
 isAuthenticated,
 hasPermission("canViewData"),
 validId('bugId'),
 validId('testId'),
 async (req, res) => {
  try {
    const { bugId, testId } = req.params;
    const testCase = await getNestedItem('bugs', '_id', bugId, "testCases", testId);
    return res.status(200).json(testCase);
  } catch (err) {
    if (err.status) {
      autoCatch(err, res);
    } else {
      console.error(err);
      return res.status(500).json({ error: 'Failed to GET test case' });
    };
  };
});
//|========================================================================================|
//|------------------------------------[-POST-REQUESTS-]-----------------------------------|
//|========================================================================================|
//|============================================|
//|---[-CREATE-A-NEW-TEST-CASE-FOR-A-BUG-]-----|
//|============================================|
router.post('/:bugId/tests',
 attachSession,
 isAuthenticated,
 hasPermission("canAddTestCase"),
 validId("bugId"),
 validBody(testSchema),
 async (req, res) => {
  debugTests(`POST /:bugId/tests hit`);
  try {
    const { bugId } = req.params;
    const newTestData = req.body;
    await insertIntoDocument('bugs', bugId, 'testCases', newTestData);
    debugTests(`Test case added to bug ${bugId}`);
    return res.status(201).json({ message: `Test case added successfully` });
  } catch (err) {
    if (err.status) {
      autoCatch(err, res);
    } else {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create test case' });
    };
  };
});
//|========================================================================================|
//|---------------------------------------[-PATCH-REQUESTS-]-------------------------------|
//|========================================================================================|
//|============================================|
//|------[-UPDATE-A-TEST-CASE-FOR-A-BUG-]------|
//|============================================|
router.patch('/:bugId/tests/:testId',
 attachSession,
 isAuthenticated,
 hasPermission("canEditTestCase"),
 validId('bugId'),
 validId('testId'),
 validBody(testPatchSchema),
 async (req, res) => {
  try {
    const { bugId, testId } = req.params;
    const updates = req.body;
    await updateNestedItem('bugs', bugId, 'testCases', testId, updates);
    debugTests(`Test case ${testId} updated for bug ${bugId}`);
    return res.status(200).json({ message: 'Test case updated successfully' });
  } catch (err) {
    if (err.status) {
      autoCatch(err, res);
    } else {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update test case' });
    };
  };
});
//|============================================|
//|-----[ DELETE A TEST CASE FROM A BUG ]------|
//|============================================|
router.delete('/:bugId/tests/:testId',
 attachSession,
 isAuthenticated,
 hasPermission("canDeleteTestCase"),
 validId('bugId'),
 validId('testId'),
 async (req, res) => {
  try {
    debugTests(`DELETE /:bugId/tests/:testId hit`);
    const { bugId, testId } = req.params;
    await deleteNestedItem('bugs', bugId, 'testCases', testId);
    debugTests(`Test case ${testId} deleted from bug ${bugId}`);
    return res.status(200).json({ message: 'Test case deleted successfully' });
  } catch (err) {
    if (err.status) {
      autoCatch(err, res);
    } else {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete test case' });
    };
  };
});
//|====================================================================================================|
//|---------------------------------------------[-FUNCTIONS-]------------------------------------------|
//|====================================================================================================|
function autoCatch(err, res) {
  console.error(err);
  return res.status(err.status).json({ error: err.message });
};
//|====================================================================================================|
//|-------------------------------------------[-EXPORT-ROUTER-]-----------------------------------------|
//|====================================================================================================|
export { router as testRouter };
