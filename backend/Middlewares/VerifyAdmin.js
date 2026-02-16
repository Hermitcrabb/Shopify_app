
const verifyAdmin = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: "Unauthorized access" });
    }
    // In a real app, we would verify JWT here
    next();
};


module.exports = verifyAdmin;