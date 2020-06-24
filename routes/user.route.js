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

	var findUser = await usersModel.findOne({
		accountNumber: req.body.accountNumber,
	});
	if (findUser) {
		return res.status(400).send({ message: "Account number is exist!" });
	}

	var findUser2 = await usersModel.findOne({
		email: req.body.email,
	});
	if (findUser2) {
		return res.status(400).send({ message: "Email number is exist!" });
	}

	var findUser3 = await usersModel.findOne({
		username: req.body.username,
	});
	if (findUser3) {
		return res.status(400).send({ message: "Username is exist!" });
	}

	const user = new usersModel(req.body);
	user.setPasswordHash(req.body.password);
	user
		.save()
		.then((userData) => {
			res.status(200).send({ message: "Create new customer successfully!" });
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
		result.passwordHash = "";
		res.json(result);
	} else
		res.status(404).send({ message: "Không tìm thấy thông tin người dùng" });
});

// --- Update user's info based on JWT Token ---
router.patch("/me", async (req, res) => {
	const { name, email, phone } = req.body;
	const userToUpdate = {
		name: name,
		email: email,
		phone: phone,
	};
	await usersModel.findOneAndUpdate(
		{ username: req.user.username },
		userToUpdate,
		(err, result) => {
			if (err) throw new Error();
			else res.json(result);
		}
	);
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

// ----- Get specific user info with his/her id -----

router.get("/:id", async (req, res) => {
	const id = req.params.id;
	const findingUser = await usersModel
		.find({ accountNumber: id })
		.then((result) => result)
		.catch((err) => {
			throw new Error(err);
		});

	if (findingUser.length > 0) {
		return res.json(findingUser);
	}
	return res.json({
		error: "Không có dữ liệu nào của người dùng!",
	});
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
		return res.status(400).json({ message: "Id không được rỗng" });
	}

	try {
		const user = await usersModel.findOne({ _id });
		if (user) {
			const result = await usersModel.findOneAndUpdate(
				{ _id },
				{
					balance: balance || user.balance,
					permission: permission || user.permission,
					accountNumber: accountNumber || user.accountNumber,
					username: username || user.username,
					name: name || user.name,
					email: email || user.email,
					phone: phone || user.phone,
				}
			);
			if (result) {
				const data = await usersModel.findOne({ _id: result._id });
				if (data) {
					return res
						.status(200)
						.json({ message: "Cập nhật thành công.", data });
				}
			}
		} else {
			return res
				.status(400)
				.json({ message: "Không tìm thấy khách hàng này." });
		}
	} catch (err) {
		console.log("err: ", err);
		return res.status(500).json({ message: "Đã có lỗi xảy ra." });
	}
});

router.patch("/receiver-list", async (req, res) => {
	// {
	// 		"accountNumber": "5edb5f2d9bd2c03f1c410814",
	// 		"bankId": 0,
	// 		"savedName": "Thuong"
	//     "_id": "5ee24345c2b4724218e7d1ec"
	// }
	const { user } = req;
	const receiver = req.body;
	if (user) {
		let { receivers } = user;
		// console.log(user)
		// console.log(receivers)
		let flag = 0;
		receivers.forEach((rec) => {
			if (
				rec.accountNumber == receiver.accountNumber ||
				rec.savedName == receiver.savedName
			) {
				flag = 1;
				res.status(400).json({ message: "Trùng tài khoản hoặc tên lưu trữ" });
			}
		});
		if (flag === 1) return;
		console.log(receivers);

		receivers.push(receiver);
		const result = await usersModel.findOneAndUpdate(
			{ accountNumber: user.accountNumber },
			{
				receivers: receivers,
			}
		);
		if (result) {
			return res.status(200).json({ message: "Cập nhật thành công." });
		}
	} else {
		return res.status(400).json({ message: "Không tìm thấy khách hàng này." });
	}
});

router.patch("/receiver-list-update/", async (req, res) => {
	// {
	// 		"accountNumber": "5edb5f2d9bd2c03f1c410814",
	// 		"bankId": 0,
	// 		"savedName": "Thuong"
	// }
	const { user } = req;
	const receiver = req.body;
	if (user) {
		let { receivers } = user;
		let flag = 0;
		receivers.forEach((rec) => {
			if (
				rec.accountNumber == receiver.accountNumber &&
				rec.bankId == receiver.bankId
			) {
				flag = 1;
				rec.savedName = receiver.savedName;
			}
		});
		if (flag === 0)
			return res.status(400).json({ message: "Không tìm thấy người nhận này" });
		const result = await usersModel.findOneAndUpdate(
			{ accountNumber: user.accountNumber },
			{
				receivers: receivers,
			}
		);
		if (result) {
			return res.status(200).json({ message: "Cập nhật thành công." });
		}
	} else {
		return res.status(400).json({ message: "Không tìm thấy khách hàng này." });
	}
});

router.delete("/receiver-list", async (req, res) => {
	// {
	// 		"accountNumber": "5edb5f2d9bd2c03f1c410814",
	// 		"bankId": 0,
	// }
	const { user } = req;
	const receiver = req.body;
	if (user) {
		let { receivers } = user;
		let flag = -1;

		// finding index
		flag = receivers.findIndex((element, index, array) => {
			if (
				element.bankId === receiver.bankId &&
				element.accountNumber === receiver.accountNumber
			)
				return element;
		});

		if (flag !== -1) receivers.splice(flag, 1);
		const result = await usersModel.findOneAndUpdate(
			{ accountNumber: user.accountNumber },
			{
				receivers: receivers,
			}
		);
		if (result) {
			return res.status(200).json({ message: "Cập nhật thành công." });
		}
	} else {
		return res.status(400).json({ message: "Không tìm thấy khách hàng này." });
	}
});

router.patch("/change-password", async (req, res) => {
	const { user } = req;
	const { password, newPassword } = req.body;
	if (user) {
		let isTrueOldPass = await bcrypt.compare(password, user.passwordHash);
		if (isTrueOldPass) {
			newPasswordHash = bcrypt.hashSync(newPassword, 10);
			const result = await usersModel.findOneAndUpdate(
				{ accountNumber: user.accountNumber },
				{
					passwordHash: newPasswordHash || user.passwordHash,
				}
			);
			if (result) {
				const data = await usersModel.findOne({
					accountNumber: result.accountNumber,
				});
				if (data) {
					return res.status(200).json({ message: "Cập nhật thành công." });
				}
			}
		} else {
			return res.status(400).json({ message: "Password cũ sai" });
		}
	} else {
		return res.status(400).json({ message: "Không tìm thấy khách hàng này." });
	}
});

// ----- Get specific user info with his/her id -----
router.get("/:id", async (req, res) => {
	const id = req.params.id;
	const findingUser = await usersModel
		.find({ accountNumber: id, role: "customer" })
		.then((result) => result)
		.catch((err) => {
			throw new Error(err);
		});

	if (findingUser.length > 0) {
		const result = {
			accountNumber: findingUser[0].accountNumber,
			name: findingUser[0].name,
		};
		return res.json(result);
	}
	return res.json({
		error: "Không có dữ liệu nào của người dùng!",
	});
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
