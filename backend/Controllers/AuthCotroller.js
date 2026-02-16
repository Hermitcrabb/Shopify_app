const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../Models/User");

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (user) {
      return res.status(409).json({
        message: "User already exists, you can login",
        success: false,
      });
    }

    const userModel = new UserModel({ name, email, password });
    userModel.password = await bcrypt.hash(password, 10);
    await userModel.save();
    res.status(201).json({ message: "Signup successfully", success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", err, success: false });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    const errorMsg = "Auth failed email or password is wrong";
    if (!user) {
      return res.status(403).json({
        message: errorMsg,
        success: false,
      });
    }

    const isPassEqual = await bcrypt.compare(password, user.password);

    if (!isPassEqual) {
      return res.status(403).json({
        message: errorMsg,
        success: false,
      });
    }

    const jwtToken = jwt.sign(
      {
        email: user.email,
        _id: user._id,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.status(201).json({
      message: "Login successfully",
      success: true,
      token: jwtToken,
      email: user.email,
      name: user.name,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal Server Error", err, success: false });
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await UserModel.findById(userId).select("name email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ name: user.name, email: user.email });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const logout = (req, res) => {
  return res.status(200).json({ message: "Logged Out" });
};

module.exports = {
  signup,
  login,
  getMe,
  logout,
};
