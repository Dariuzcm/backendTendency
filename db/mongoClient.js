const { MongoClient, ObjectId } = require("mongodb");

const url = 'mongodb://127.0.0.1:27017'
const client = new MongoClient(url);

const dbName = 'logger';

async function getConnection() {
  await client.connect()
  const db = client.db(dbName)
  return db
}
async function searchCollection(collectionName) {
  db = await getConnection()
  const collection = db.collection(collectionName)

  return collection
}
async function find(data, collectionName) {
  const collection = await searchCollection(collectionName);
  const result = await collection.find(data).toArray()
  return {result, collectionName}
}

async function findByObjectId(objectId){
  let finded = []
  for (const col in tables) {
    finded.push(find({ _id: new ObjectId(objectId) }, tables[col]))
  }

  finded = await Promise.all(finded);
  let findedItem = null
  for (const item of finded) {
    if (item.result.length != 0) {
      findedItem = item.result[0]
      findedItem.objectType = item.collectionName
      if (findedItem?.application_id) {
        const application = await find({ _id: new ObjectId(findedItem.application_id) }, tables.APP)
        findedItem.application = application
      }
      break;
    }
  }
  return findedItem;
}

async function insertOne(data, collectionName) {
  const collection = await searchCollection(collectionName);
  const result = await collection.insertOne({...data, created_at: Date.now()});
  client.close()
  return { ...result, ...data, created_at: Date.now() }
}

async function updateOne(data, objectId, collectionName) {
  const collection = await searchCollection(collectionName)
  data.updated_at = Date.now()
  const result = await collection.updateOne({ _id: new ObjectId(objectId) }, { $set: data });
  client.close()

  return result;
}
async function deleteItem(id, collectionName){
  const collection = await searchCollection(collectionName)
  const objectId = new ObjectId(id)
  const {result} = await find({_id: objectId}, collectionName)
  const res = await collection.deleteOne(result[0])
  return res
}

const tables = {
  LOGS: 'logger',
  APP: 'application',
  AUTH: 'authorizations',
  USER: 'users'
}
Object.freeze(tables)

module.exports = { find, insertOne, updateOne, tables, ObjectId, findByObjectId, deleteItem };