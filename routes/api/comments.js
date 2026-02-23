//|====================================================================================================|
//|-------------------------------------------[ INITIALIZATION ]---------------------------------------|
//|====================================================================================================|
//|==================================================|
//|-------------------[-DATABASE-]-------------------|
//|==================================================|
import {getByField,
 insertNewComment,
 insertIntoDocument,
 getNestedItem} 
 from '../../database.js'; 
//|==================================================|
//|------------------[-AUTHENTICATION-]--------------|
//|==================================================|
import { hasPermission, isAuthenticated } 
from '../../middleware/authentication.js';
//|==================================================|
//|-------------------[-VALIDATION-]-----------------|
//|==================================================|
import { validId,
 validBody } 
 from '../../middleware/validation.js';
//|==================================================|
//|-------------------[-SCHEMA-]---------------------|
//|==================================================|
import { commentSchema } 
from '../../middleware/schema.js';
//|==================================================|
//|----------------[-EXPRESS & DEBUG-]---------------|
//|==================================================|
import express from 'express';
import debug from 'debug';
//|====================================================================================================|
//|--------------------------------------  [ MIDDLEWARE INITIALIZATION ]-------------------------------|
//|====================================================================================================|
const router = express.Router();
const debugComments = debug('app:Comments');
router.use(express.urlencoded({ extended: false }));
router.use(express.json());
//|====================================================================================================|
//|----------------------------------------------[-GET-REQUESTS-]--------------------------------------|
//|====================================================================================================|
//|==================================================|
//|-----------[-GET-ALL-COMMENTS-FOR-A-BUG-]---------|
//|==================================================|
router.get('/:bugId/comments',
 isAuthenticated,
 hasPermission("canViewData"),
 validId('bugId'),
 async (req, res) => {
  try {
    debugComments(`GET /:bugId/comments hit`);
    const { bugId } = req.params;
    const bugData = await getByField('bugs', '_id', bugId)
    if (!bugData.comments || bugData.comments.length === 0) {
      return res.status(404).json({ error: `Bug ${bugId} has no comments.` });
    };
    return res.status(200).json(bugData.comments);
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to GET comments' });
    };
  };
});
//|==================================================|
//|-----------[-GET-A-SPECIFIC-COMMENT-BY-ID-]-------|
//|==================================================|
router.get('/:bugId/comments/:commentId',
 isAuthenticated,
 hasPermission("canViewData"),
 validId('bugId'),
 validId('commentId'),
 async (req, res) => {
  debugComments(`GET /:bugId/comments/:commentId hit`);
  try {
    const { bugId, commentId } = req.params;
    const foundComment = await getNestedItem('bugs', '_id', bugId, 'comments', commentId)
    return res.status(200).json(foundComment);
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to update bug' });
    };
  };
});
//|====================================================================================================|
//|--------------------------------------------[-POST-REQUESTS-]---------------------------------------|
//|====================================================================================================|
//|==================================================|
//|----------[-POST-A-NEW-COMMENT-TO-A-BUG-]---------|
//|==================================================|
router.post('/:bugId/comments',
 isAuthenticated,
 hasPermission("canAddComments"),
 validId('bugId'),
 validBody(commentSchema),
 async (req, res) => {
  debugComments(`POST /:bugId/comments hit`);
  try {
    const { bugId } = req.params;
    const newComment = req.body;
    // Add comment to bug
    await insertIntoDocument('bug', bugId, 'comments', newComment) 
    return res.status(201).json([{ message: 'Comment added', newComment }]);
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to update bug' });
    };
  };
});
//|====================================================================================================|
//|-------------------------------------------[-FUNCTIONS-]--------------------------------------------|
//|====================================================================================================|
function autoCatch(err, res){ validId('bugId')
    console.error(err);
    return res.status(err.status).json({ error: err.message });
};
//|====================================================================================================|
//|-----------------------------------------[-EXPORT-ROUTER-]------------------------------------------|
//|====================================================================================================|
export { router as commentRouter };