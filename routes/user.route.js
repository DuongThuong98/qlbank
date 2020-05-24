const express = require("express");
const moment = require("moment");
const md5 = require("md5");
const NodeRSA = require("node-rsa");
const usersModel = require("../models/users.model");
const process = require("../config/process.config");
const { Validator } = require("node-input-validator");
var validator = require("email-validator");

const router = express.Router();

const confirm = (req) => {
	const ts = req.get("ts");
	const partnerCode = req.get("partnerCode");
	const hashedSign = req.get("hashedSign");

	const comparingSign = md5(ts + req.body + md5("dungnoiaihet"));
	console.log(`${comparingSign} - ${hashedSign}`);
	if (ts <= moment().unix() - 150) {
		return 1;
	}

	// console.log(partnerCode)
	if (partnerCode != "huuTien123") {
		return 2;
	}

	if (hashedSign != comparingSign) {
		return 3;
	}

	if (!req.body.id) {
		return 4;
	} else {
		return 0;
	}
};

// ----- Register new user -----
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

router.delete("/:id", async (req, res) => {
	const id = req.params.id;
	const user = await usersModel.remove({ _id: id }, (err, data) => {
		if (err) throw new Error();
		if (data) res.json(data);
	});
});

module.exports = router;
