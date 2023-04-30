const joi = require('joi');
joi.ObjectId = require('joi-objectid')(joi)

const application = joi.object({
  name: joi.string().alphanum().required()
});

const authorizations = joi.object({
  application_id: joi.ObjectId().required(),
  token: joi.string().required()
});

const logs = joi.object({
  application_id: joi.ObjectId().required(),
  type: joi.string().valid('error', 'info', 'warning').required(),
  path: joi.string().valid('lowest', 'low', 'medium', 'high', 'highest').required(),
  request: joi.object({
    data: joi.any()
  }).required(),
  response: joi.object({
    data: joi.any()
  }).required()
});

const userSchema = joi.object({
  username: joi.string().alphanum().required(),
  password: joi.string().alphanum().required()
})

module.exports = { userSchema, logs, authorizations, application };
