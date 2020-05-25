const express = require("express");
const moment = require("moment");
const md5 = require("md5");
const NodeRSA = require("node-rsa");
const usersModel = require("../models/users.model");
const process = require("../config/process.config");
const axios = require("axios");

const router = express.Router();

const confirm = (req) => {
	const ts = req.get("ts");
	const partnerCode = req.get("partnerCode");
	const hashedSign = req.get("hashedSign");

	const comparingSign = md5(ts + req.body + md5("dungnoiaihet"));
	if (ts <= moment().unix() - 150) {
		return 1;
	}

	if (partnerCode != "3TBank" && partnerCode != "baoSon123") {
		return 2;
	}

	if (hashedSign != comparingSign) {
		return 3;
	}

	if (!req.body.accountNumber) {
		return 4;
	} else {
		return 0;
	}
};

// --EXTERNAL-SERVER--- nhận request, hash và trả về tên người dùng cho ngân hàng khác ---
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

	await usersModel.findOne(
		{ accountNumber: req.body.accountNumber },
		(err, data) => {
			if (err) {
				return res
					.status(500)
					.send({ message: "Đã có lỗi xảy ra, vui lòng thử lại!" });
			}
			if (data) {
				// Chỉ trả về tên của người dùng thôi.
				return res.status(200).send({
					accountNumber: data.accountNumber,
					name: data.name.toUpperCase(),
				});
			} else {
				return res.status(403).send({ message: "Không có dữ liệu" });
			}
		}
	);
});

// --EXTERNAL-SERVER--- nhận request, hash + verify và nạp tiền
router.post("/transaction/", async (req, res) => {
	// req -> headers [ts, partnerCode, hashedSign] + [sign (req.body-RSA)]
	// req -> bodyjson: {sentId: _id, bankId: 1, accountNumber: _id, amount: 50000, content: "Tien an 2020", [timestamps]}
	// response -> "thành công hay không"

	// bodyjson: {sentId: _id, bankId: 1, accountNumber: _id, amount: 50000, content: "Tien an 2020", [timestamps]}

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

	// const sign = req.get("sign");
	let Key_Public;
	switch (req.get("partnerCode")) {
		case "baoSon123":
			Key_Public = process.Bank_BAOSON.RSA_PUBLICKEY;
			break;
		case "3TBank":
			Key_Public = process.Bank_3T.RSA_PUBLICKEY;
			break;
		default:
			Key_Public = 0;
	}

	const sign = req.get("sign");
	const keyPublic = new NodeRSA(Key_Public);
	var veri = keyPublic.verify(req.body, sign, "base64", "base64");

	if (veri != true) {
		return res.status(400).send({
			message: "Sai chữ kí",
		});
	}
	await usersModel.findOne(
		{ accountNumber: req.body.accountNumber },
		async (err, user) => {
			if (err) {
				return res
					.status(500)
					.send({ message: "Đã có lỗi xảy ra, vui lòng thử lại!" });
			}
			if (user) {
				const userNewBalance = user.balance + req.body.amount;
				user.balance = userNewBalance;
				await user
					.save()
					.then((newData) => {
						if (newData.balance === userNewBalance) {
							return res.json({ message: "Giao dịch thành công" });
						}
						return res.json({ message: "Không giao dịch được" });
					})
					.catch((err) => {
						throw new Error(err);
					});
			} else {
				return res.status(403).send({ message: "Không có dữ liệu" });
			}
		}
	);
});

const SERVER_URL = "https://qlbank1.herokuapp.com";

router.post("/3TBank/customer", async (req, res) => {
	const timeStamp = Date.now();
	const partnerCode = "3TBank"; // SAPHASANBank
	const bodyJson = { id: "12345" };
	const signature = timeStamp + bodyJson + md5("dungnoiaihet");

	await axios
		.post(`${SERVER_URL}/api/external/customer`, bodyJson, {
			headers: {
				ts: timeStamp,
				partnerCode: partnerCode,
				hashedSign: md5(signature),
			},
		})
		.then((result) => {
			const { data } = result;
			if (result.data) res.json(result.data);
		})
		.catch((error) => {
			res.status(500).json(error);
		});
});

router.get("/3TBank/transaction", async (req, res) => {
	const timeStamp = Date.now();
	const partnerCode = "SAPHASANBank";
	const bodyJson = {
		accountNumber: req.body.accountNumber,
		amount: req.body.amount,
	};
	const signature = timeStamp + bodyJson + md5("dungnoiaihet");
	const privateKey = new NodeRSA(process.SAPHASAN.RSA_PRIVATEKEY);
	const sign = privateKey.sign(bodyJson, "base64", "base64");
	await axios
		.post(`${SERVER_URL}/api/external/transaction`, bodyJson, {
			headers: {
				ts: timeStamp,
				partnerCode: partnerCode,
				hashedSign: md5(signature),
				sign: sign,
			},
			// data: `id=${customerId}`,
		})
		.then((result) => {
			const { data } = result;
			res.json(data);
		})
		.catch((error) => {
			res.json(error);
		});
});

module.exports = router;
