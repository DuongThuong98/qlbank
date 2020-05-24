const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const saltRounds = 10;

const UserSchema = mongoose.Schema(
	// {
	// 	"username": "trieu",
	// 	"password": "1234",
	// 	"name": "Nguyễn Ngọc Khắc Triệu",
	// 	"email": "khactrieu@gmail.com",
	// 	"phone": "0903020192",
	// 	dob: Date,
	// 	"avatar": "12345",
	// }
	{
		accountNumber: String, // Tai khoan ngan hang, chỉ số dài 7 kí tự. Vd: "4224201"
		username: String,
		passwordHash: String,
		name: String, // Tên đầy đủ
		email: String,
		phone: String,
		balance: { type: Number, default: 50000 },
		permission: { type: Boolean, default: true },
		refreshToken: String,
		rdt: Date,
	},
	{
		timestamps: true,
	}
);

UserSchema.methods.setPasswordHash = function (password) {
	this.passwordHash = bcrypt.hashSync(password, saltRounds);
};

const Users = mongoose.model("Users", UserSchema);
module.exports = Users;
