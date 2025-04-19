const jwt = require('jsonwebtoken')

const verifytoken = (req,res,next) => {
    const token = req.cookies.token
    if(!token) return res.status(401).json({ message: "Access Denied. No token Provided" })
        try {
            const decoded = jwt.verify(token , process.env.JWT_SECRET)
            req.user = decoded
            next()
        } catch (error) {
            return res.status(401).json({ message: "Invalid Token" });
        }
  

}
module.exports = verifytoken