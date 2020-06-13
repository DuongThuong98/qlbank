const express = require("express");
const bcrypt = require("bcryptjs");
const usersModel = require("../models/users.model");
const { Validator } = require("node-input-validator");
var validator = require("email-validator");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const router = express.Router();

// --- ADD new user (register) ---
router.post("/", async (req, res) => {
	const v = new Validator(req.body, {
		email: "required|email",
		password: "required",
	});

	v.check().then((matched) => {
		if (!matched) {
			res.status(400).send(v.errors);
		}
	});

	let isValidEmail = validator.validate(req.body.email);
	if (!isValidEmail) res.status(400).send("Email không hợp lệ!");

	const user = new usersModel(req.body);
	user.setPasswordHash(req.body.password);
	user
		.save()
		.then((userData) => {
			res.status(200).send({ user: userData });
		})
		.catch((err) => {
			console.log("error: ", err.message);
			return res
				.status(500)
				.send({ message: "Đã có lỗi xảy ra, vui lòng thử lại" });
		});
});

// --- Get user's info based on JWT Token ---
router.get("/me", (req, res) => {
	if (req.user) {
		const result = req.user;
		console.log(result);
		delete result["passwordHash"];
		console.log(result.passwordHash);
		res.json(result);
	} else
		res.status(404).send({ message: "Không tìm thấy thông tin người dùng" });
	// usersModel.findOne()
});

// ----- Get all users in database ----- INTERNAL
router.get("/", async (req, res) => {
	const allUsers = await usersModel
		.find()
		.then((result) => result)
		.catch((err) => {
			throw new Error(err);
		});

	if (allUsers.length > 0) {
		return res.send(allUsers);
	}
	return res.json({
		error: "Không có dữ liệu nào của người dùng!",
	});
});

router.get("/all-receiver-list", async (req, res) => {
	const { _id } = req.user
	try {
		const user = await usersModel.findOne({ _id })
		if (user) {

			return res.status(200).json({ data: user.receivers })
		}
		else {
			return res.status(400).json({ message: "Không tìm thấy khách hàng này." })
		}
	}
	catch (err) {
		console.log('err: ', err)
		return res.status(500).json({ message: "Đã có lỗi xảy ra." })
	}
});

router.post("/one-receiver-list", async (req, res) => {
	// {
	// 	"accountNumber": "00000003",
	//     "_id": "5ee2430bc2b4724218e7d1ea"
	// }
	const { _id} = req.user;
	const { accountNumber } = req.body;
	try {
		const user = await usersModel.findOne({ _id })
		const recs = user.receivers;
		if (user) {
			let flag = 0;
			recs.forEach(rec => {
				if (rec.accountNumber == accountNumber) {
					flag = 1;
					return res.status(200).json({ data: rec })
				}
			});
			if (flag == 0) {
				return res.status(400).json({ message: "Không tìm thấy receiver này." })
			}
		}
		else {
			return res.status(400).json({ message: "Không tìm thấy khách hàng này." })
		}
	}
	catch (err) {
		console.log('err: ', err)
		return res.status(500).json({ message: "Đã có lỗi xảy ra." })
	}
});


//---Update user
router.patch("/", async (req, res) => {
	// {
	// 	"balance": 50000,
	//     "permission": true,
	//     "receivers": [],
	//     "_id": "5ee222fc372b270017d284c3",
	//     "accountNumber": "000004",
	//     "username": "thuyloan",
	//     "name": "Nguyễn Thúy Loan",
	//     "email": "thuyloan@gmail.com",
	//     "phone": "09112345534",
	//     "passwordHash": "$2a$10$Qg2oDhpV8UJSKURez/ldHOVloYjWR.bo0.DrJERgsKnVefdlTOHwC",
	// }

	const { _id} = req.user;
	const { balance, permission, accountNumber,
		username, name, email, phone } = req.body
	if (!_id) {
		return res.status(400).json({ message: "Id không được rỗng" })
	}

	try {
		const user = await usersModel.findOne({ _id })
		if (user) {
			const result = await usersModel.findOneAndUpdate({ _id },
				{
					balance: balance || user.balance,
					permission: permission || user.permission,
					accountNumber: accountNumber || user.accountNumber,
					username: username || user.username,
					name: name || user.name,
					email: email || user.email,
					phone: phone || user.phone,
				})
			if (result) {
				const data = await usersModel.findOne({ _id: result._id })
				if (data) {
					return res.status(200).json({ message: "Cập nhật thành công.", data })
				}
			}
		}
		else {
			return res.status(400).json({ message: "Không tìm thấy khách hàng này." })
		}
	}
	catch (err) {
		console.log('err: ', err)
		return res.status(500).json({ message: "Đã có lỗi xảy ra." })
	}
});

router.patch("/receiver-list", async (req, res) => {
	// {
	// 	"receiver": {
	// 		"accountNumber": "5edb5f2d9bd2c03f1c410814",
	// 		"bankId": 0,
	// 		"savedName": "Thuong"
	// 	},
	//     "_id": "5ee24345c2b4724218e7d1ec"
	// }
	const { _id} = req.user;
	const { receiver } = req.body
	if (!_id) {
		return res.status(400).json({ message: "Id không được rỗng" })
	}

	try {
		const user = await usersModel.findOne({ _id })

		if (user) {
			let newReceivers = user.receivers;
			// console.log(user)
			// console.log(newReceivers)
			let flag = 0;
			newReceivers.forEach(rec => {
				if (rec.accountNumber == receiver.accountNumber ||
					rec.savedname == receiver.savedName) {
					flag = 1;
					return res.status(400).json({ message: "Trùng tài khoản hoặc tên lưu trữ" })
				}
			});

			if (flag = 0) {
				newReceivers.push(receiver);
				const result = await usersModel.findOneAndUpdate({ _id },
					{
						receivers: newReceivers || user.receivers,
					})
				if (result) {
					const data = await usersModel.findOne({ _id: result._id })
					if (data) {
						return res.status(200).json({ message: "Cập nhật thành công.", data })
					}
				}
			}
			// return res.status(400).json({ message: "TEST" })
		}
		else {
			return res.status(400).json({ message: "Không tìm thấy khách hàng này." })
		}
	}
	catch (err) {
		console.log('err: ', err)
		return res.status(500).json({ message: "Đã có lỗi xảy ra." })
	}
});

router.patch("/change-password", async (req, res) => {
	const { _id} = req.user;
	const { password, newPassword } = req.body
	if (!_id) {
		return res.status(400).json({ message: "Id không được rỗng" })
	}

	try {
		const user = await usersModel.findOne({ _id })

		if (user) {
			let isTrueOldPass = await bcrypt.compare(password, user.passwordHash);
			if (isTrueOldPass) {
				newPasswordHash = bcrypt.hashSync(newPassword, 10);
				const result = await usersModel.findOneAndUpdate({ _id },
					{
						passwordHash: newPasswordHash || user.passwordHash,
					})
				if (result) {
					const data = await usersModel.findOne({ _id: result._id })
					if (data) {
						return res.status(200).json({ message: "Cập nhật thành công.", data })
					}
				}
			} else {
				return res.status(400).json({ message: "Password cũ sai" })
			}
		}
		else {
			return res.status(400).json({ message: "Không tìm thấy khách hàng này." })
		}
	}
	catch (err) {
		console.log('err: ', err)
		return res.status(500).json({ message: "Đã có lỗi xảy ra." })
	}
});



// ----- Delete user with id in database ----- INTERNAL
router.delete("/:id", async (req, res) => {
	const id = req.params.id;
	await usersModel.remove({ _id: id }, (err, data) => {
		if (err) throw new Error();
		if (data) res.json(data);
	});
});

module.exports = router;
