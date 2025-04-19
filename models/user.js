const mongoose = require('mongoose')

// mongoose.connect("mongodb://127.0.0.1:27017/social-media-app")

const userSchema = mongoose.Schema({
    name: String ,
    username: String ,
    email: String ,
    password: String ,
    age: Number,
    bio: String,
    city: String,
    country: String,
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    }],
    profile: {
        type: String,
        default: '/uploads/default.jpg'
    },
    profileCover: {
        type: String,
        default: '/uploads/defaultCover.jpg'
    }

})

const user = mongoose.model('user' , userSchema)

module.exports = user
