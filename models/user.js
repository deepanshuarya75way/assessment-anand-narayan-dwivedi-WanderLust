const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
});

userSchema.plugin(passportLocalMongoose, { usernameLowerCase: true });

module.exports = mongoose.model("User", userSchema);