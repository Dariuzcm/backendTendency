'use strinct';
const { userSchema } = require('../Models/Schemas');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const { find, tables, insertOne, updateOne, ObjectId, findByObjectId, deleteItem } = require("../db/mongoClient");
const { verifyToken, secret } = require('../utils/utils');
const { validateSchema } = require('../utils/utils');

const createOptions = {
	logger: async (data) => {
		try {
			const { application_id } = data;
			const app = await find({ _id: new ObjectId(application_id) }, tables.APP)

			if (app.length == 0) {
				throw Error('Invalid application_id')
			}

			const log = await insertOne(data, tables.LOGS)

			return { ...log, ...data }
		} catch (error) {
			return { error, data }
		}
	},
	authorizations: async (data) => {
		try {
			const { application_id } = data;
			const app = await find({ _id: new ObjectId(application_id) }, tables.APP)
			if (app.length == 0) {
				throw Error('Invalid application_id')
			}
			const auth = await insertOne(data, tables.AUTH)

			return { ...auth, ...data }
		} catch (error) {
			return { error, data }
		}
	},
	application: async (data) => {
		try {
			const finded = await find({ name: data.name }, tables.APP)
			if (finded.lenght)
				throw Error('Application name already exist')
			const app = await insertOne(data, tables.APP)
			return { ...app, ...data }
		} catch (error) {
			return { error, data }
		}
	}
}

class MainController {

	async all(req, res) {
		const logs = await find({}, tables.LOGS)
		const all = logs.map(async (log) => {
			const { application_id } = log;
			const application = await find({ _id: new ObjectId(application_id) }, tables.APP)
			return {
				...log,
				application
			}
		})
		const result = await Promise.all(all)
		return res.status(200).send(result);
	}

	async create(req, res) {
		const { body, headers } = req;

		const error = verifyToken(headers.authorization)
		if (error) {
			return res.status(401).send(error)
		}

		let option = validateSchema(body)

		if (!option) {
			return res.status(405).send('Can`t create object');
		}

		const result = await createOptions[option](body);

		if (result.error)
			return res.status(500).send({ error: result.error, message: "Error trying to create".concat(data.toArray()) })
		return res.status(201).send({ ...result, ...body });
	}

	async info(req, res) {
		const { params, headers } = req
		let findedItem = null

		const error = verifyToken(headers.authorization)
		if (error) {
			return res.status(401).send(error)
		}

		try {
			findedItem = await findByObjectId(params.id)
		} catch (error) {
			return res.status(401).send(error.message)
		}
		if (!findedItem) {
			res.status(404).send('Item not found')
		}
		if(findedItem.objectType === tables.USER){
			findedItem.password = 'CENSURED'
		}
		res.status(200).send(findedItem);
	}

	async update(req, res) {
		const { params, body, headers } = req;
		const error = verifyToken(headers.authorization)
		if (error) {
			return res.status(401).send(error)
		}

		try {
			const finded = await findByObjectId(params.id)
			if (!finded) {
				return res.status(404).send('Item not found')
			}
			await updateOne(body, params.id, finded.objectType)

			return res.status(204).send({})
		} catch (error) {
			return res.status(401).send(error.message)
		}
	}

	async delete(req, res) {
		const { headers, params } = req
		const error = verifyToken(headers.authorization)
		if (error) {
			return res.status(401).send(error)
		}

		try {
			const finded = await findByObjectId(params.id)
			const delResult = await deleteItem(params.id, finded.objectType)
			return res.status(200).send(delResult)
		} catch (error) {
			return res.status(400).send(error.message)
		}
	}

	async login(req, res) {
		const { error, value } = userSchema.validate(req.body)
		if (error) {
			return res.status(400).send(error)
		}

		const { username, password } = req.body;

		const { result } = await find({ username }, tables.USER)
		if (result.lenght == 0) {
			return res.status(404).send('User not found')
		}

		const match = await bcrypt.compare(password, result[0].password);
		if (!match)
			return res.status(406).send('rejected password');

		const token = jwt.sign({ username, date: Date.now(), }, secret, { expiresIn: '10h' })
		await updateOne({
			token
		}, result[0]._id.toString(), tables.USER);

		return res.status(200).send({ token, username });
	}

	async createUser(req, res) {
		const { username, password } = req.body;
		const { error, value } = userSchema.validate(req.body)
		if (error) {
			return res.status(401).send(error)
		}
		const { result } = await find({ username }, tables.USER)
		if (result.length > 0) {
			return res.status(409).send('User already exist')
		}
		const hashedPassword = await bcrypt.hash(password, 10);
		const userCreated = await insertOne({ username, password: hashedPassword }, tables.USER);

		return res.status(200).send({ ...userCreated, username });
	}

}

module.exports = new MainController();
