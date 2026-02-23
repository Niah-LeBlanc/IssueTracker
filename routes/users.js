//|====================================================================================================|
//|-------------------------------------------[-IMPORTS-]----------------------------------------------|
//|====================================================================================================|
//|==================================================|
//|---------------------[-SCHEMA-]-------------------|
//|==================================================|
import { 
 userSchema,
 userLoginSchema,
 userPatchSchema,
 userListQuerySchema } 
 from '../../middleware/schema.js';
//|==================================================|
//|-----------------[-AUTHENTICATION-]---------------|
//|==================================================|
import { 
 attachSession,
 hasPermission,
 hasRole,
 isAuthenticated } 
 from '../../middleware/authentication.js';
//|==================================================|
//|-------------------[-DATABASE-]-------------------|
//|==================================================|
import { 
 listAll,
 getByField,
 deleteByObject,
 updateUser,
 insertNew} 
 from '../../database.js'; 
//|==================================================|
//|--------------------[-BCRYPT-]--------------------|
//|==================================================|
import { 
 genPassword,
 comparePassword } 
 from '../../middleware/bcryptFunctions.js';
//|==================================================|
//|------------------[-VALIDATION-]------------------|
//|==================================================|
import { 
 validId,
 validBody,
 validQuery } 
 from '../../middleware/validation.js';
//|==================================================|
//|---------------[-EXPRESS & DEBUG-]----------------|
//|==================================================|
import express from 'express';
import debug from 'debug';
//|====================================================================================================|
//|----------------------------------------[-MIDDLEWARE INITIALIZATION-]-------------------------------|
//|====================================================================================================|
const router = express.Router();
const debugUser = debug('app:UserRouter');
router.use(express.urlencoded({ extended: false }));
router.use(express.json());
//|====================================================================================================|
//|---------------------------------------------[-MY-REQUESTS-]----------------------------------------|
//|====================================================================================================|
//|==================================================|
//|----------------[-GET-MY-INFO-]-------------------|
//|==================================================|
router.get(
  '/me',
  attachSession,
  isAuthenticated,
  async (req, res) => {
  try {
    const foundUser = await getByField('user', '_id', validId(req.user.id));
    debugUser(`Success: (GET/me: ${(req.user.id)})`);
    return res.status(200).json([foundUser]);
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }
    else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to update bug' });
    }
  };
});
//|==================================================|
//|----------------[-CHANGE-MY-INFO-]----------------|
//|==================================================|
router.put(
  '/me',
  attachSession,
  isAuthenticated,
  validBody(userPatchSchema(false)),
  async (req, res) => {
    try {
      const updates = req.body;
      if (updates.password) {
        updates.password = await genPassword(updates.password);
      };
      const updatedUser = await updateUser(validId(req.user.id), updates);
      debugUser(`Success: (PUT /me: ${req.id})`);
      return res.status(200).json(updatedUser);
    } catch (err) {
      if (err.status) {
        autoCatch(err, res);
      } else {
        console.error(err);
        return res.status(500).json({ error: 'Failed to update user' });
      }
    }
  }
);
//|====================================================================================================|
//|----------------------------------------------[-GET-REQUESTS-]--------------------------------------|
//|====================================================================================================|
//|==================================================|
//|----------------[-LIST-ALL-USERS-]----------------|
//|==================================================|
router.get(
  '/',//endpoint 
  attachSession,//attaches previously made session without making a new one
  isAuthenticated,//Checks to see if the user is authenticated(loggedIn)
  hasPermission('canViewData'),
  validQuery(userListQuerySchema),
  async (req, res) => {
    try {
      const query = req.query;
      const foundData = await listAll('user', query);

      debugUser('Success: (GET /list users)');
      return res.status(200).json(foundData);
    } catch (err) {
      if (err.status) {
        autoCatch(err, res);
      } else {
        console.error(err);
        return res.status(500).json({ error: 'Failed to list users' });
      }
    };
  }
);
//|==================================================|
//|----------------[-GET-USER-BY-ID-]----------------|
//|==================================================|
router.get(
  '/:userId',
  attachSession,
  isAuthenticated,
  hasPermission("canViewData"),
  validId('userId'),
  async (req, res) => {
  try {
    const { userId } = req.params;
    const foundUser = await getByField('user', '_id', userId);
    debugUser(`Success: (GET/:userId: ${userId})`);
    return res.status(200).json([foundUser]);
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }
    else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to update bug' });
    }
  };
});
//|========================================================================================|
//|---------------------------------------[-POST-REQUESTS-]--------------------------------|
//|========================================================================================|
//|==================================================|
//|----------------[-REGISTER-USER-]-----------------|
//|==================================================|
router.post('',
  attachSession,
  isAuthenticated,
  validBody(userSchema),
  async (req,res) => {
  try {
    const newUser = req.body;
    newUser.password = await genPassword(newUser.password);
    newUser.creationDate = new Date() 
    await insertNew('user', newUser) 
    debugUser(`Success: (POST/register: ${newUser.givenName})`);
    return res.status(201).json([{ message: `New User ${newUser.givenName + " " + newUser.familyName} Registered!` }]);
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }
    else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to update bug' });
    }
  };
});
//|==================================================|
//|------------------[-LOGIN-USER-]------------------|
//|==================================================|
router.post('/login', attachSession, isAuthenticated, validBody(userLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getByField("user", "email", email)
    comparePassword(password, user.password);
    debugUser(`Success: (POST/login: ${user._id})`);
    return res.status(200).json([{message: `Welcome back! ${user._id}`}])
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }
    else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to update bug' });
    }
  };
});
//|========================================================================================|
//|---------------------------------------[-PATCH-REQUESTS-]-------------------------------|
//|========================================================================================|
//|==================================================|
//|----------------[-PATCH-USER-BY-ID-]--------------|
//|==================================================|
router.patch('/:userId', attachSession, isAuthenticated, hasPermission("canEditAnyUser"), validId('userId'), validBody(userPatchSchema(false)), async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    if (updates.password) {
      updates.password = await genPassword(updates.password);
    };
    await updateUser(userId, updates)
    debugUser(`Success: (PATCH/:userId ${user._id})`);
    return res.status(200).json([{ message: `User ${userId} updated successfully.` }]);
  } catch (err) {
    if(err.status){
      autoCatch(err, res)
    }
    else{
      console.error(err);
      return res.status(500).json({ error: 'Failed to update bug' });
    }
  };
});
//|========================================================================================|
//|---------------------------------------[-DELETE-REQUESTS-]------------------------------|
//|========================================================================================|
//|==================================================|
//|----------------[-DELETE-USER-BY-ID-]-------------|
//|==================================================|
router.delete('/:userId', attachSession, isAuthenticated, hasPermission("canEditAnyUser"), validId('userId'), async (req, res) => {
  try {
    const {userId} = req.params;
    const result = await deleteByObject("user", '_id', userId)
    if (!result.deletedCount) {
      return res.status(404).json({ message: `User ${userId} not found.` });
    };
    debugUser(`Success: (DELETE/:userId ${user._id})`);
    return res.status(200).json([{ message: `User ${userId} deleted successfully.` }]);
    }catch (err) {
      if(err.status){
        autoCatch(err, res)
      }
      else{
        console.error(err);
        return res.status(500).json({ error: 'Failed to delete User' });
      }
    };
});
//|====================================================================================================|
//|-------------------------------------------[ FUNCTIONS ]--------------------------------------------|
//|====================================================================================================|
function autoCatch(err, res){
    console.error(err);
    return res.status(err.status).json({ error: err.message });
};
//|==================================================|
//|----------------[EXPORT-ROUTER]-------------------|
//|==================================================|
export { router as userRouter };