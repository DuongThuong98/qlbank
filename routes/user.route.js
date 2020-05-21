const express = require("express");
const moment = require("moment");
const md5 = require("md5");
const NodeRSA = require("node-rsa");
const usersModel = require("../models/users.model");
const process = require("../config/process.config");

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

// --EXTERNAL--- Post to get specific customer (with verify method) ---
router.post("/customer/", async (req, res) => {
	var con = confirm(req);
	switch (con) {
		case 1:
			return res.status(400).send({
				message: "Thời gian request quá hạn",
			});
		case 2:
			return res.status(400).send({
				message: "Bạn không là đối tác",
			});
		case 3:
			return res.status(400).send({
				message: "Tệp tin có thể đã bị sửa đổi",
			});
		case 4:
			return res.status(400).send({
				message: "Không nhận được ID",
			});
	}

	await usersModel.findOne({ _id: req.body.id }, (err, data) => {
		if (err) {
			return res
				.status(500)
				.send({ message: "Đã có lỗi xảy ra, vui lòng thử lại!" });
		}
		if (data) {
			// Chỉ trả về tên của người dùng thôi.
			return res.status(200).send({ user: data.name.toUpperCase() });
		} else {
			return res.status(403).send({ message: "Không có dữ liệu" });
		}
	});
});

//
router.post("/transaction/", async (req, res) => {
	const sign = req.get("sign");
	const keyPublic = new NodeRSA(process.huuTien.RSA_PUBLICKEY);

	// bodyjson: {id: _id, amount: 50000}
	var veri = keyPublic.verify(req.body, sign, "base64", "base64");
	var con = confirm(req);
	// console.log(con);
	switch (con) {
		case 1:
			return res.status(400).send({
				message: "Thời gian request quá hạn",
			});
		case 2:
			return res.status(400).send({
				message: "Bạn không là đối tác",
			});
		case 3:
			return res.status(400).send({
				message: "Tệp tin có thể đã bị sửa đổi",
			});
		case 4:
			return res.status(400).send({
				message: "Không nhận được ID",
			});
	}
	if (veri != true) {
		return res.status(400).send({
			message: "Sai chữ kí",
		});
	}
	await usersModel.findOne({ _id: req.body.id }, async (err, data) => {
		if (err) {
			return res
				.status(500)
				.send({ message: "Đã có lỗi xảy ra, vui lòng thử lại!" });
		}
		if (data) {
			// ? tại sao trả về 400?
			data.balance += req.body.amount;
			await data.save();
			return res.json({ username: data.name, balance: data.balance });
		} else {
			return res.status(403).send({ message: "Không có dữ liệu" });
		}
	});
});

module.exports = router;
