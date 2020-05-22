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

// --EXTERNAL--- Post to get specific customer (with verify method) ---
router.post("/customer/", async (req, res) => {
	// req -> headers [ts, partnerCode, hashedSign]
	// req -> body {id: 1}
	// response -> username
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

	await usersModel.findOne({ accountNumber: req.body.id }, (err, data) => {
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
	// req -> headers [ts, partnerCode, hashedSign] + [sign (req.body-RSA)]
	// req -> body {id: 1, amount}
	// response -> username
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
	await usersModel.findOne(
		{ accountNumber: req.body.id },
		async (err, data) => {
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
		}
	);
});

module.exports = router;
