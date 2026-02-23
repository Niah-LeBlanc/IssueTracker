//|====================================================================================================|
//|-------------------------------------------[-INITIALIZATION-]---------------------------------------|
//|====================================================================================================|
//|==================================================|
//|-------------------[-IMPORTS-]--------------------|
//|==================================================|
import { MongoClient, ObjectId } from "mongodb";
import debug from "debug";
import dotenv from "dotenv";
//|==================================================|
//|----------------[-INSTANTIATION-]-----------------|
//|==================================================|
dotenv.config();
const debugDb = debug("app:Database");
let _db = null;
let _client = null;
const now = new Date()
const db = await connect();
//|====================================================================================================|
//|-------------------------------------------[-ROUTE-FUNCTIONS-]--------------------------------------|
//|====================================================================================================|
//|==================================================|
//|-------------[-GET-ALL-FROM-COLLECTION-]----------|
//|==================================================|
export async function listAll(collectionName, query = {}) {
  query = Object.assign({}, query); // Converts [Object: null prototype] into a normal object

  // Convert numeric strings to numbers
  const minAge = query.minAge ? Number(query.minAge) : null;
  const maxAge = query.maxAge ? Number(query.maxAge) : null;

  console.log(`Querying '${collectionName}' with:`, query);

  const mongoQuery = {};
  let mongoSort = {};

  // Optional role filter
  if (query.role) {
    mongoQuery.role = query.role;
  }

  // Optional age range filter (minAge/maxAge in days)
  if (minAge || maxAge) {
    const now = new Date();
    mongoQuery.creationDate = {};

    if (minAge) {
      const minAgeDate = new Date(now.getTime() - minAge * 24 * 60 * 60 * 1000);
      mongoQuery.creationDate.$lte = minAgeDate;
    }

    if (maxAge) {
      const maxAgeDate = new Date(now.getTime() - maxAge * 24 * 60 * 60 * 1000);
      mongoQuery.creationDate.$gte = maxAgeDate;
    }

    if (Object.keys(mongoQuery.creationDate).length === 0) {
      delete mongoQuery.creationDate;
    }
  }

  // Optional sort
  if (query.sortBy) {
    switch (query.sortBy) {
      case 'givenName':
        mongoSort = { givenName: 1 };
        break;
      case 'familyName':
        mongoSort = { familyName: 1 };
        break;
      case 'role':
        mongoSort = { role: 1 };
        break;
      case 'title':
        mongoSort = { title: 1 };
        break;
      case 'classification':
        mongoSort = { classification: 1 };
        break;
      case 'assignedTo':
        mongoSort = { assignedTo: 1 };
        break;
      case 'createdBy':
        mongoSort = { createdBy: 1 };
        break;
      case 'newest':
        mongoSort = { creationDate: -1 };
        break;
      case 'oldest':
        mongoSort = { creationDate: 1 };
        break;
      default:
        mongoSort = {};
    }
  }

  const cursor = db.collection(collectionName).find(mongoQuery);

  if (Object.keys(mongoSort).length > 0) {
    cursor.sort(mongoSort);
  }

  const foundData = await cursor.toArray();

  if (!foundData || foundData.length === 0) {
    const err = new Error(`No records found in collection "${collectionName}".`);
    err.status = 404;
    throw err;
  }

  return foundData;
}

//|================================================|
//|--------------[-GET-BY-FIELD-]------------------|
//|================================================|
export async function getByField(collectionName, fieldName, fieldValue) {
  let query;

  if (Array.isArray(fieldValue)) {
    // If array, use $in to match any value in the array
    query = { [fieldName]: { $in: fieldValue } };
  } else {
    // Single value (old behavior)
    query = { [fieldName]: fieldValue };
  }

  const foundData = Array.isArray(fieldValue)
    ? await db.collection(collectionName).find(query).toArray() // return all matches
    : await db.collection(collectionName).findOne(query);        // return single match

  if (!foundData || (Array.isArray(fieldValue) && foundData.length === 0)) {
    const err = new Error(`${fieldValue} not found.`);
    err.status = 404;
    throw err;
  }

  return foundData;
}

//|================================================|
//|---------------[-GET-NESTED-ITEM-]--------------|
//|================================================|
export async function getNestedItem(
    collectionName,
    fieldName,
    fieldValue,
    nestedArrayPath,   // e.g. 'comments' or 'testCases.testCase'
    nestedItemId
  ) {
  const query = {
    [fieldName]: fieldValue,
    [`${nestedArrayPath}.${fieldName}`]: nestedItemId
  };
  const projection = {
    [`${nestedArrayPath}.$`]: 1
  };
  const result = await db.collection(collectionName).findOne(query, { projection });
  if(!result){
    const err = new Error(`${nestedItemId} not found`);
    err.status = 404;
    throw err;
  };
  return result
};

//|================================================|
//|------------[-INSERT-NEW-OBJECT-]---------------|-
//|================================================|
export async function insertNew(collectionName, newFieldValue) {
  // Map of unique fields to their collections
  const uniqueChecks = {
    //field: 'collection'
    email: "user",
    title: "bug",
  };

  // Check for uniqueness
  for (const [field, collection] of Object.entries(uniqueChecks)) {
    if (newFieldValue[field]) {
      const found = await db.collection(collection).findOne({ [field]: newFieldValue[field] });
      if (found) {
        const err = new Error(
          field === "email"
            ? `${newFieldValue[field]} already exists.`
            : `The bug titled: "${newFieldValue[field]}" already exists.`
        );
        err.status = 409;
        throw err;
      }
    }
  }

  // Insert document
  const result = await db.collection(collectionName).insertOne(newFieldValue);

  // Return inserted document with ID
  return { ...newFieldValue, _id: result.insertedId };
}

//|================================================|
//|------------[-INSERT-INTO-DOCUMENT-]------------|
//|================================================|
export async function insertIntoDocument(collectionName, documentId, arrayFieldName, valueToInsert) {
  valueToInsert = {
    _id: new ObjectId(),
    ...valueToInsert,
    dateTime: now.toLocaleDateString(), 
    timeOfCreation: now.toLocaleTimeString()
  };
  const result = await db.collection(collectionName).updateOne(
    {_id: documentId},
    {$push: {[arrayFieldName]: valueToInsert}}
  );
  if(!result.matchedCount){
    const err = new Error(`${documentId} not found`);
    err.status = 404;
    throw err;
  };
  if(!result.modifiedCount){
    const err = new Error(`Failed to update ${collectionName}`);
    err.status = 500;
    throw err;
  };
  return result;
};
//|================================================|
//|--------------[-DELETE-BY-OBJECT-]--------------|
//|================================================|
export async function deleteByObject(collectionName, fieldName, fieldValue) {
  await getByField(collectionName, fieldName, fieldValue)
  const deletedItem = await db.collection(collectionName).deleteOne({ [fieldName]: fieldValue });
  return deletedItem;
};
//|====================================================================================================|
//|------------------------------------[-DATABASE-USER-FUNCTIONS-]-------------------------------------|
//|====================================================================================================|
//|================================================|
//|--------------[-UPDATE-USER-]-------------------|
//|================================================|
export async function updateUser(userId, updatedUser) {
  //checks if any updates have been passed
  if (Object.values(updatedUser).length === 0) {
    const err = new Error("No fields provided to update");
    err.status = 400;
    throw err;
  };
  const existingUser = await getByField('user', "_id", userId);
  if(!existingUser){
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  };
   // Check if any values actually differ
  const isDifferent = Object.entries(updatedUser).some(([key, value]) => {
    return JSON.stringify(existingUser[key]) !== JSON.stringify(value);
  });
  if (!isDifferent) {
    const err = new Error("No changes were made — values are the same");
    err.status = 400;
    throw err;
  };
  //Updates the user 
  const result = await db.collection('user').updateOne(
    { _id: userId },
    { $set: { ...updatedUser, lastUpdated: now}}
  );
  if (result.matchedCount === 0) {
      const err = new Error("User not found");
      err.status = 404; // Not Found
      throw err;
  };
  //if the user isn't modified throws an error
  if (result.modifiedCount === 0) {
    const err = new Error("No changes were made to the user");
    err.status = 400; // Bad Request
    throw err;
  };
  return result;
};
//|====================================================================================================|
//|------------------------------------[-DATABASE-BUGS-FUNCTIONS-]-------------------------------------|
//|====================================================================================================|
//|================================================|
//|--------------[-UPDATE-BUG-]--------------------|
//|================================================|
export async function updateBug(bugId, updatedBug) {
  //checks if any updates have been passed
  if (Object.values(updatedBug).length === 0) {
    const err = new Error("No fields provided to update");
    err.status = 400;
    throw err;
  };
  const existingBug = await getByField('bugs', "_id", bugId);
  if(!existingBug){
    const err = new Error("Bug not found");
    err.status = 404;
    throw err;
  };
   // Check if any values actually differ
  const isDifferent = Object.entries(updatedBug).some(([key, value]) => {
    return JSON.stringify(existingBug[key]) !== JSON.stringify(value);
  });
  if (!isDifferent) {
    const err = new Error("No changes were made — values are the same");
    err.status = 400;
    throw err;
  };
  //Updates the bug
  const result = await db.collection('bugs').updateOne(
    { _id: bugId},
    { $set: { ...updatedBug, lastUpdated: now}}
  );
  return result;
};
//|================================================|
//|---------[-UPDATE:-ASSIGN-BUG-TO-USER]----------|
//|================================================|
export async function assignBugToUser(userId, bugId) {

  const existingUser = await getByField('user', '_id', userId);
  if (!existingUser) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  };

  // Make sure bugId is a proper ObjectId
  const bugObjectId = typeof bugId === 'string' ? new ObjectId(bugId) : bugId;

  // Check if the bug is already assigned
  const alreadyAssigned = existingUser.assignedBugs?.some(
    (assignedId) => assignedId.equals(bugObjectId)
  );
  if (alreadyAssigned) {
    const err = new Error("Bug already assigned to user");
    err.status = 409;
    throw err;
  };
  // Add the bug ID to the user's assignedBugs
  const result = await db.collection('user').updateOne(
    { _id: userId },
    {
      $addToSet: { assignedBugs: bugObjectId },
      $set: { lastUpdated: now}
    }
  );
  if (result.modifiedCount === 0) {
    const err = new Error("No changes were made to the user");
    err.status = 400;
    throw err;
  };
  return result;
};
//|====================================================================================================|
//|------------------------------------[-DATABASE-COMMENTS-FUNCTIONS-]---------------------------------|
//|====================================================================================================|
//|================================================|
//|---------[-UPDATE:-insertNewComment-]-----------|
//|================================================|
export async function insertNewComment(bugId, newFieldValue) {
  const existingBug = await getByField('bugs', "_id", bugId);
  if(!existingBug){
    const err = new Error("Bug not found");
    err.status = 404;
    throw err;
  };
   // Check if any values actually differ
  const isDifferent = Object.entries(newFieldValue).some(([key, value]) => {
    return JSON.stringify(existingBug[key]) !== JSON.stringify(value);
  });
  if (!isDifferent) {
    const err = new Error("Bug Cannot be a copy");
    err.status = 400;
    throw err;
  };
  const result = await db.collection('bugs').updateOne({_id: bugId}, {$push: {comments: newFieldValue}});
  return result;
};
//|====================================================================================================|
//|-------------------------------------------[-MONGO-FUNCTIONS-]--------------------------------------|
//|====================================================================================================|
//|==================================================|
//|-----------[-MONGODB-INITIALIZATION-]-------------|
//|==================================================|
export async function connect() {
  try {
    if (_db) return _db;
    const connectionString = process.env.MONGO_URI;
    const dbName = process.env.MONGO_DB_NAME;
    if (!connectionString) {
      throw new Error("Missing MONGO_URI environment variable");
    };
    if (!dbName) {
      throw new Error("Missing MONGO_DB_NAME environment variable");
    };
    const client = await MongoClient.connect(connectionString);
    _db = client.db(dbName);
    return _db;
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    throw err;
  };
};
//|==================================================|
//|---------------------[-PING-]---------------------|
//|==================================================|
export async function ping() {
  const pong = await db.command({ ping: 1 });
  debugDb(`ping: ${JSON.stringify(pong)}`);
};
//|==================================================|
//|------------------[-GET-CLIENT-]------------------|
//|==================================================|
export async function getClient(){
  if(!_client){
    await connect();
  }
  return _client
};
//|==================================================|
//|------------------[-GET-DATABASE-]----------------|
//|==================================================|
export async function getDatabase(){
  return await connect();
};