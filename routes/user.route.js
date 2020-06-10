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

// ----- Delete user with id in database ----- INTERNAL
router.delete("/:id", async (req, res) => {
	const id = req.params.id;
	await usersModel.remove({ _id: id }, (err, data) => {
		if (err) throw new Error();
		if (data) res.json(data);
	});
});

module.exports = router;
