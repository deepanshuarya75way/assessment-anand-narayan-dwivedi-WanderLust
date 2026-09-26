const Joi = require('joi');

const listingSchema = Joi.object({
    listing : Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        country: Joi.string().required(),
        price: Joi.number().min(0).required(),
        image: Joi.object({
            filename: Joi.string().allow("", null),
            url: Joi.string().allow("", null)
        }).allow(null)
    }).required()
});
module.exports = listingSchema;

module.exports.reviewSchema = Joi.object({review: Joi.object({
    username: Joi.string().trim().required(),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().required()
}).required()
})

module.exports.registerSchema = Joi.object({
    username: Joi.string().trim().min(3).max(30).required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(8).required(),
    returnTo: Joi.string().optional(),
});