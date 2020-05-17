
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const saltRounds = 10;

const UserSchema = mongoose.Schema({
  // entity = {
      // "username": "admin",
      // "password_hash": "admin",
      // "name": "admin",
      // "email": "admin@g.c",
      // "dob": "1990-09-09",
      // "permission": 0
    // }
  passwordHash: String,
  avatar: String,
  phone: String,
  username: String,
  passwordHash: String,
  name: String,
  email: String,
  dob: Date,
  permission: Boolean,
  refreshToken: String,
  rdt: Date
   
}, {
    timestamps: true,
});

UserSchema.methods.setPasswordHash = function(password) {
  this.passwordHash = bcrypt.hashSync(password, saltRounds);
};


const Users = mongoose.model("Users", UserSchema);
module.exports = Users;