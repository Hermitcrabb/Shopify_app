const {
  signup,
  login,
  logout,
  getMe,
} = require("../Controllers/AuthCotroller");
const ensureAuthenticated = require("../Middlewares/Auth");
const {
  signupValidation,
  loginValidation,
} = require("../Middlewares/AuthValidation");

const router = require("express").Router();

router.post("/login", loginValidation, login);
router.post("/signup", signupValidation, signup);
router.post("/logout", logout);

router.get("/check", ensureAuthenticated, (req, res) => {
  res.status(200).json({ authenticated: true, name: req.user.name });
});
router.get("/me", ensureAuthenticated, getMe);

module.exports = router;
