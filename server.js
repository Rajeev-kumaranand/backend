require("dotenv").config()
const express = require('express')
const app = express()
const cors = require('cors')
const userModule = require('./models/user')
// const bcrypt = require('bcrypt');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const postModule = require("./models/post");
const upload = require('./configs/profileconfig')
const path = require('path')
const verifytoken = require('./middlewares/tokenverify');
const { error } = require('console');
const mongoose = require('mongoose')


app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true 
}));
app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.log("DB error:", err));


// Disk storage Used

app.get('/', (req, res) => {
    res.send("Server is Running perfectly")
})
app.post('/api/register', async (req, res) => {
    const { name, username, email, password, age } = req.body


    try {

        const existuser = await userModule.findOne({ username })
        if (existuser) return res.status(200).json({ message: "Username already exist" })

        bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(password, salt, async function (err, hash) {
                let user = await userModule.create({
                    name,
                    username,
                    email,
                    password: hash,
                    age
                })
                let token = jwt.sign({ username, userid: user._id }, process.env.JWT_SECRET);
                res.cookie("token", token , {
                    httpOnly: true,
                    secure: true,            
                    sameSite: "None",        
                  })

                res.status(201).json({ message: "User registered", user: user });
            });
        });


    } catch (error) {
        res.status(500).json({ error: "Failed to register user" });
    }

})

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body
    console.log(username,password)
    try {
        let notexist = await userModule.findOne({ username })
        console.log(notexist)
        if (!notexist) {
            return res.status(200).json({ message: "Wrong Username" });
        } else {
            bcrypt.compare(password, notexist.password, function (err, result) {
                if (result) {
                    let token = jwt.sign({ username, userid: notexist._id }, process.env.JWT_SECRET);
                    res.cookie("token", token,{
                        httpOnly: true,
                        secure: true,         
                        sameSite: "None"     
                      })
                    res.status(201).json({ message: "Login success", user: notexist });
                } else {
                    res.status(200).json({ message: "Invalid password" });
                }
            });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to Login" });
    }
})
app.get('/api/verify', async (req, res) => {
    let token = req.cookies.token

    if (!token) return res.status(401).json({ error: "Unauthorized" })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    let user = await userModule.findOne({ username: decoded.username })
    if (!user) return res.status(400).json({ error: "invalid token" })
    res.status(200).json({ message: "authorized", user: user })

})

app.post('/api/post', upload.single('post'), async (req, res) => {
    const { content, user } = req.body
    console.log(req.body)
    let postUrl = req.file ? `/uploads/${req.file.filename}` : null
    console.log(postUrl)
    try {
        let post = await postModule.create({
            content,
            user,
            postimg: postUrl
        })
        let finduser = await userModule.findOne({ _id: user })
        finduser.posts.push(post._id)
        await finduser.save()
        let senduser = await userModule.findOne({ _id: user }).populate("posts")
        res.status(201).json({ message: "Post Created", post, senduser })
    } catch (error) {
        res.status(500).json({ error: "Failed to create post" })
    }

})
app.post('/api/getposts', async (req, res) => {
    let token = req.cookies.token
    try {
        if (!token)  return res.status(401).json({ error: "Unauthorizeddd" }) 
        

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        let user = await userModule.findOne({ username: decoded.username }).populate("posts")
        if (!user) return res.status(400).json({ error: "invalid token" })
        res.status(201).json({ message: "Post Created", user })

    } catch (error) {

    }
    // let userid = req.body._id
    // try {
    //     let senduser = await userModule.findOne({_id: userid}).populate("posts")
    // res.status(201).json({message: "Getted Post", senduser})
    // } catch (error) {
    //     res.status(501).json({ error: "Failed to get post" })
    // }  
})
app.post("/api/deletepost", async (req, res) => {
    const { postid } = req.body
    let token = req.cookies.token
    let decoded = jwt.verify(token, process.env.JWT_SECRET)
    let user = await userModule.findOne({ username: decoded.username })
    try {
        if (!token) return res.status(401).json({ message: "Token not found" })
        if (!postid) return res.status(400).json({ message: "Post not Founded" })
        await userModule.updateOne({ _id: user._id }, { $pull: { posts: postid } })
        let deletedpost = await postModule.findByIdAndDelete(postid)

        res.status(200).json({ message: "Post deleted", deletedpost })
    } catch (error) {
        res.status(500).json({ message: "Something Wrong", error })
    }
})
// app.post("/api/editpost",async (req,res)=>{
//     let post = await postModule.findById(req.body.id.id)
//     // console.log(post)
//     try {
//         if(!post) return res.status(400).json({message: "post not found"})
//             res.status(200).json({message: "done",post})
//     } catch (error) {
//         res.status(500).json({ error: "Failed to load post" })
//     }

// })
app.post("/api/updatepost", upload.single('updatedPost'), async (req, res) => {
    const { content, postid } = req.body

    let updatedPostUrl = req.file ? `/uploads/${req.file.filename}` : null
    const updateData = { content };
    if (updatedPostUrl != null) {
        updateData.postimg = updatedPostUrl;
    }
    try {
        let updatepost = await postModule.findOneAndUpdate({ _id: postid },   updateData, { new: true })
        res.status(200).json({ updatepost })
    } catch (error) {
        res.status(400).json({ message: "SOmething wronG" })
    }
})
app.post("/api/logout", async (req, res) => {
    try {
        let token = ""
        res.cookie("token", token ,{
            httpOnly: true,
            secure: true,         
            sameSite: "None"     
          })
        res.status(200).json({ message: "LogOUT+" })
    } catch (error) {
        res.status(400).json({ message: "SOmething wronG" })
    }
})

app.post('/api/picupdate', upload.single('profile'), async (req, res) => {

    let imageUrl = `/uploads/${req.file.filename}`
    console.log(imageUrl)
    let user = await userModule.findById(req.body.userid)
    user.profile = imageUrl
    await user.save()
    res.redirect('http://localhost:5173/profile');
});

app.post("/api/like", verifytoken, async (req, res) => {
    console.log(req.body)
    console.log(req.user)
    let Likeduser = await userModule.findById(req.user.userid)
    let post = await postModule.findById(req.body.id)
    let alreadyliked = post.likes.indexOf(req.user.userid);
    if (alreadyliked !== -1) {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1)
        await post.save()
        res.status(200).json({ message: "unliked" })
    } else {
        post.likes.push(req.user.userid)
        await post.save()
        res.status(200).json({ message: "liked" })
    }

})
app.post("/api/searchuser", async (req, res) => {
    console.log(req.body.username)
    let searcheduser = await userModule.findOne({ username: req.body.username })
    console.log(searcheduser)
    try {
        if (!searcheduser) return res.status(200).json({ message: "notuser" })
        res.status(200).json({ message: "user exist", searcheduser })
    } catch (error) {
        res.status(500).json(error)
    }
})
app.post("/api/updateProfile", upload.fields([
    { name: 'profileCover', maxCount: 1 },
    { name: 'profilePic', maxCount: 1 }
]), verifytoken, async (req, res) => {
    const { name, username, bio, city, country } = req.body
    let profileCover = req.files['profileCover'] ? req.files['profileCover'][0] : null
    let profileCoverUrl = profileCover ? `/uploads/${profileCover.filename}` : undefined
    let profilePic = req.files['profilePic'] ? req.files['profilePic'][0] : null
    let profilePicUrl = profilePic ? `/uploads/${profilePic.filename}` : undefined

    try {
        let user = await userModule.findByIdAndUpdate(req.user.userid, { name, username, bio, city, country, profileCover: profileCoverUrl, profile: profilePicUrl }, { new: true })
        console.log(user)
        res.status(200).json({ message: "Profile UPDATED", user })
    } catch (error) {
        res.status(500).json(error)
    }
})
app.post("/api/SearchedUser", async (req, res) => {
    const searcheduser = await userModule.findById(req.body.id).populate('posts')
    try {
        if (!searcheduser) return res.status(400).json({ message: "invalidId" })
        res.status(200).json({ message: "Success", searcheduser })
    } catch {
        res.status(500).json(error)
    }
})

// app.listen(3000)
const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });