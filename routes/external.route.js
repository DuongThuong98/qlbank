const express = require("express");
const moment = require("moment");
const md5 = require("md5");
const NodeRSA = require("node-rsa");
const usersModel = require("../models/users.model");
const process = require("../config/process.config");
const axios = require("axios");
const hash = require("object-hash");
const openPgp = require("openpgp");
const fs = require("fs");
const path = require("path");

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
router.post("/customer", async (req, res) => {
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
router.post("/transaction", async (req, res) => {
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
							const privateKey = new NodeRSA(process.SAPHASAN.RSA_PRIVATEKEY);
							const sign = privateKey.sign("SAPHASANBank", "base64", "base64");
							return res.json({ sign: sign, message: "Giao dịch thành công" });
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

router.post("/3TBank/customer", async (req, res) => {
	if (!req.body.accountNumber || isNaN(+req.body.accountNumber))
		return res.status(500).json({ message: "Please provide valid id." });

	const timeStamp = moment().unix() * 1000;
	const partnerCode = "SAPHASANBank"; // SAPHASANBank
	const signature = timeStamp + md5("dungnoiaihet");

	await axios
		.get(`${process.Bank_3T.SERVER_URL}/api/v1/user`, {
			headers: {
				ts: timeStamp,
				partnerCode: partnerCode,
				hashedSign: md5(signature),
			},
			params: {
				accountId: +req.body.accountNumber,
			},
		})
		.then((result) => {
			if (result.data) return res.json(result.data);
		})
		.catch((error) => {
			return res.status(500).json(error);
		});
});

router.post("/3TBank/transaction", async (req, res) => {
	const timeStamp = moment().unix() * 1000;
	const partnerCode = "SAPHASANBank";
	const bodyJson = {
		accountId: +req.body.accountNumber,
		cost: +req.body.amount,
	};
	const signature = bodyJson + timeStamp + md5("dungnoiaihet");
	const privateKey = new NodeRSA(process.SAPHASAN.RSA_PRIVATEKEY);
	const sign = privateKey.sign(bodyJson, "base64", "base64");
	await axios
		.post(
			`${process.Bank_3T.SERVER_URL}/api/v1/user/change-balance`,
			bodyJson,
			{
				headers: {
					ts: timeStamp,
					partnerCode: partnerCode,
					hashedSign: md5(signature),
					sign: sign,
				},
			}
		)
		.then((result) => {
			if (result.data);
			res.json(result.data);
		})
		.catch((error) => {
			res.json(error);
		});
});

router.post("/BAOSON/customer", async (req, res) => {
	const data = {
		id: req.body.accountNumber,
	};
	let result = await axios({
		method: "post",
		url: "http://192.168.43.103:3000/banks/detail", // link ngan hang muon chuyen toi
		data: data,
		headers: {
			nameBank: "SAPHASANBank",
			ts: moment().unix(),
			sig: hash(moment().unix() + data.id + "secretkey"),
		},
	});
	if (!result) {
		return res.status(404).json({ info: false });
	} else {
		return res.status(201).json(result.data);
	}
});

router.post("/BAOSON/transaction", async (req, res) => {
	const privateKeyArmored = fs.readFileSync(
		path.join(__dirname, "../config/PGPKeys/SAPHASAN-PGP-private.asc"),
		"utf8"
	); // encrypted private key
	const passphrase = "12345"; // password that private key is encrypted with
	const {
		keys: [privateKey],
	} = await openPgp.key.readArmored(privateKeyArmored);
	await privateKey.decrypt(passphrase);
	const { data: cleartext } = await openPgp.sign({
		message: openPgp.cleartext.fromText("From SAPHASANBank"), // CleartextMessage or Message object
		privateKeys: [privateKey], // for signing
	});
	let data = {
		id: req.body.accountNumber,
		amount: req.body.amount,
	};
	let result = await axios({
		method: "post",
		url: "http://192.168.43.103:3000/banks/transfers", // link ngan hang muon chuyen toi
		data: data,
		headers: {
			nameBank: "SAPHASANBank",
			ts: moment().unix(),
			sig: hash(moment().unix() + data + "secretkey"),
			sigpgp: JSON.stringify(cleartext),
		},
	});

	//Verify signature back
	const publicKeyArmored = fs.readFileSync(
		path.join(__dirname, "../config/PGPKeys/BAOSON-PGP-public.asc"),
		"utf8"
	); // encrypted private key
	const verified = await openPgp.verify({
		message: await openPgp.cleartext.readArmored(result.data.sign),
		publicKeys: (await openPgp.key.readArmored(publicKeyArmored)).keys, // for verification
	});
	const { valid } = verified.signatures[0];
	if (valid) {
		return res.json(result.data);
	}
	return res.status(404).end();
});

module.exports = router;
