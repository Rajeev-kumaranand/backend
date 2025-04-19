const mongoose = require('mongoose')

const postSchema = mongoose.Schema({
    user: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],
    image: String,
    content: String,
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],
    postimg: {
        type: String
    }

})

const post = mongoose.model("post", postSchema)

module.exports = post