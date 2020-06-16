const mongoose = require("mongoose");

const VerifyCodeSchema = mongoose.Schema({
  code: Number,
  email: String,
  expriredDate: Date,
  type: Number, // type 0: forgot pass, type 1: is use in other action. Can use enum here!!!
});

const VerifyCode = mongoose.model("VerifyCode", VerifyCodeSchema);
module.exports = VerifyCode;
