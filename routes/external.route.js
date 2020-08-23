const express = require("express");
const moment = require("moment");
const md5 = require("md5");
const NodeRSA = require("node-rsa");
const usersModel = require("../models/users.model");
const transactionModel = require("../models/transaction.model");
const process = require("../config/process.config");
const axios = require("axios");
const hash = require("object-hash");
const openPgp = require("openpgp");
const fs = require("fs");
const path = require("path");

// const externalController = require("../controllers/external.controllers");

const router = express.Router();
const fees = 1000;
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

router.post("/SAPHASANBank/customer", async (req, res) => {
	// reqbody: "customerId": "1"
	const { customerId } = req.body;
	console.log(req.body);
	const timeStamp = Date.now();
	const partnerCode = "baoSon123"; // SAPHASANBank || 3TBank || baoSon123
	const bodyJson = { accountNumber: customerId };
	const signature = timeStamp + bodyJson + md5("dungnoiaihet");
	await axios
		.post(`https://qlbank1.herokuapp.com/api/external/customer`, bodyJson, {
			headers: {
				ts: timeStamp,
				partnerCode: partnerCode,
				hashedSign: md5(signature),
			},
			// data: `id=${customerId}`,
		})
		.then((result) => {
			const { data } = result;
			res.json(result.data);
		})
		.catch((error) => {
			res.json(error.response.data);
		});
});

router.post("/SAPHASANBank/transaction", async (req, res) => {
	const timeStamp = Date.now();
	const partnerCode = "baoSon123";
	const bodyJson = {
		accountNumber: req.body.customerId,
		amount: req.body.amount,
		content: req.body.content,
		amount: req.body.amount,
	};
	const signature = timeStamp + bodyJson + md5("dungnoiaihet");
	const privateKey = new NodeRSA(
		"-----BEGIN RSA PRIVATE KEY-----\n" +
			"MIICXwIBAAKBgQCyceITLtFoy4KzMgmr6NEnvk1VBH7pRuyyg7IkXc3kBspKs9CIErm2eJtEtduIPQK+3AgiQW+fjL1dDMQr7ENZiGzWhEPoSbU348mjg1fxFDztFB4QiqAd7UUvj1kK2/UT+D0C6Sgc0O69C9lRGahPSAX+7ZArGIodtfuOKPenEwIDAQABAoGBAKU98CvzXte8HPvziiE3Jve2scXYs+0xUF6+tWgXtWFDKHCksqZPMMpYRPALt48hcDltZ9rQ3ZzRp0lTWRWTY4kmnjUm1W4E7uFmJJc7KySZJH9XNbvlOceVIKPIWjZvvQ93wov03G2ajdv/NC2BT57xQ+YTaMe3GQkJGTX7V/KBAkEA8TQmBdaExOBF7mrGKMrrrvYnErtZWN4dLdPK+ipfmeSM/oD25/UHfPHbh8tkHbt9vfz4PF/3NdAWcZiMNzAKPwJBAL1kLC/SM9NFfxCLfQrmP1qTASWs4IVsxeYU4+dUVcUwL0g4WlUgCjrVCFYomWen1wCbqCvlGpON9H7CLR7fpi0CQQDI3cXAXNoqXh6+orqtI/fLt3/okI6ifC5OiK7jUEBXF0b3dwynNJ3sxjksyAty2z2m5zEOjlh/vu/B3+j82IvfAkEAqlR2PQgCnicpkPqymePb5JzDclvZjYX3Medl1L4PaYndbElqTJbFPIYtujdHSGc1wZE8nUWuMjiARKRkKhkgfQJBAIqWxELwATG3541h/7MKI2tnTC0F3g7nTLJWtgIiqYfyw/jFdsVGWZUlJriyS6LxYh+0zMdRtdscw4iWEPJ2vM4=\n" +
			"-----END RSA PRIVATE KEY-----"
	);
	const sign = privateKey.sign(bodyJson, "base64", "base64");
	await axios
		.post(`/api/external/transaction`, bodyJson, {
			headers: {
				ts: timeStamp,
				partnerCode: partnerCode,
				hashedSign: md5(signature),
				sign: sign,
			},
		})
		.then((result) => {
			const { data } = result;
			res.json(result.data);
			// console.log(result);
		})
		.catch((error) => {
			console.log(error);
			res.json(error.response.data);
		});
});
///

// --EXTERNAL-SERVER--- nhận request, hash + verify và nạp tiền
router.post("/transaction", async (req, res) => {
	// req -> headers [ts, partnerCode, hashedSign] + [sign (req.body-RSA)]
	// req -> bodyjson: {sentId: _id, bankId: 1, 
	//accountNumber: _id, amount: 50000, content: "Tien an 2020", isReceiverPaid: true}
	// response -> "thành công hay không"

	// bodyjson: {sentId: _id, bankId: 1, accountNumber: _id, amount: 50000, content: "Tien an 2020", [timestamps]}

	var con = confirm(req);

	const partnerCode = req.get("partnerCode");

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

				//cộng tiền vào tài khoản
				let userNewBalance = user.balance + req.body.amount;
				if(req.body.isReceiverPaid == true){
					userNewBalance = userNewBalance - fees;
				}
				user.balance = userNewBalance;
				await user
					.save()
					.then(async (newData) => {
						if (newData.balance === userNewBalance) {
							const privateKey = new NodeRSA(process.SAPHASAN.RSA_PRIVATEKEY);
							const message = `Người dùng ${req.body.accountNumber} từ ngân hàng SAPHASANBank đã nhận tiền từ người dùng ${req.body.sentUserId} từ ngân hàng ${partnerCode} số tiền ${req.body.amount}`;
							const responseSignature = privateKey.sign(
								message,
								"base64",
								"base64"
							);

							const transactionRecord = {
								sentUserId: req.body.sentUserId,
								sentUserName: req.body.sentUserName,
								sentBankId: partnerCode === "baoSon123" ? 2 : 1,
								receivedUserId: req.body.accountNumber,
								receivedUserName: user.name,
								receivedBankId: 0,
								isDebt: false,
								isVerified: true,
								isReceiverPaid: false,
								amount: req.body.amount,
								content: req.body.content,
								signature: sign,
							};
							await transactionModel.create(
								transactionRecord,
								async (err, tran) => {
									if (err) {
										return res.status(500).json({ message: err });
									} else {
									}
								}
							);
							return res.json({
								sign: responseSignature,
								message: message,
							});
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
	// body: "accountNumber": "97002424324123"
	console.log("BODY1: ", req.body);
	if (!req.body.accountNumber || isNaN(+req.body.accountNumber))
		return res.status(500).json({ message: "Please provide valid id." });

	const timeStamp = moment().unix() * 1000;
	const partnerCode = "SAPHASANBank"; // SAPHASANBank
	const signature = timeStamp + md5("dungnoiaihet");

	await axios
		.get(
			`${
				process.Bank_3T.SERVER_URL
			}/api/v1/user?accountNumber=${req.body.accountNumber.toString()}`,
			{
				headers: {
					ts: timeStamp,
					partnerCode: partnerCode,
					hashedSign: md5(signature),
				},
			}
		)
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
		accountNumber: req.body.accountNumber.toString(),
		cost: +req.body.cost,
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

//"Id": "2750027628572576"
router.post("/BAOSON/customer", async (req, res) => {
	const data = {
		Id: req.body.accountNumber,
	};
	let result = await axios({
		method: "post",
		url: "https://ptwncinternetbanking.herokuapp.com/banks/detail", // link ngan hang muon chuyen toi
		data: data,
		headers: {
			nameBank: "SAPHASANBank",
			ts: moment().unix(),
			sig: hash(moment().unix() + data.Id + "secretkey"),
		},
	});
	if (!result) {
		return res.status(404).json({ info: false });
	} else {
		return res.status(201).json(result.data);
	}
});

router.post("/BAOSON/transaction", async (req, res) => {
	// let paymet = await banksModel.detail({ Iduser: req.tokenPayload.userId });
	const privateKeyArmored = fs.readFileSync(
		path.join(__dirname, "../config/PGPKeys/SAPHASAN-PGP-private.asc"),
		"utf8"
	); // encrypted private key
	const passphrase = "12345"; // what the private key is encrypted with
	const {
		keys: [privateKey],
	} = await openPgp.key.readArmored(privateKeyArmored);
	await privateKey.decrypt(passphrase);
	const { data: cleartext } = await openPgp.sign({
		message: openPgp.cleartext.fromText("From SAPHASANBank"), // CleartextMessage or Message object
		privateKeys: [privateKey], // for signing
	});
	// let data = {
	// 	Id: req.body.accountNumber,
	// 	Amount: req.body.amount,
	// 	Content: req.body.content,
	// 	Fromaccount: req.body.sentUserId,
	// 	FromName: req.body.fromName,
	// 	ToName: req.body.toName,
	// 	feeBySender: req.body.feeBySender,
	// };

	let data = {
		Id: "2750027628572576",
		Amount: 50000,
		Content: "nop tien",
		Fromaccount: "123456789",
		FromName: "nguyen van abc",
		ToName: "abcscas",
		feeBySender: true,
	};
	console.log(data);
	try {
		let result = await axios({
			method: "post",
			url: "https://ptwncinternetbanking.herokuapp.com/banks/transfers", // link ngan hang muon chuyen toi
			data: {
				...data,
			},
			headers: {
				nameBank: "SAPHASANBank",
				ts: moment().unix(),
				sig: hash(moment().unix() + data + "secretkey"),
				sigpgp: JSON.stringify(cleartext),
			},
		});
		return res.status(200).json(result.data);
	} catch (error) {
		console.log("error: ", error.response);
		throw createError(401, error.response.data.err);
	}
});

//"Id": "2750027628572576"
router.post("/detailPGP", async (req, res) => {
	let data = {
		Id: req.body.Id,
	};
	console.log("ID: ", data.Id);
	let resinfo = await axios({
		method: "post",
		url: "https://ptwncinternetbanking.herokuapp.com/banks/detail", // link ngan hang muon chuyen toi
		data: data,
		headers: {
			nameBank: "baoson",
			ts: moment().unix(),
			sig: hash(moment().unix() + data.Id + "secretkey"),
		},
	});
	console.log("nhan dcuo: ", resinfo.data);
	if (!resinfo) {
		return res.status(404).json({ info: false });
	} else {
		return res.status(201).json(resinfo.data);
	}
});

// "Id": "2750027628572576",
// 	"Amount":50000,
// 	"Content":"nop tien"
// "Fromacount": "123456789"
router.post("/transferPGP", async (req, res) => {
	// let paymet = await banksModel.detail({ Iduser: req.tokenPayload.userId });
	const privateKeyArmored = fs.readFileSync(
		path.join(__dirname, "../config/PGPKeys/SAPHASAN-PGP-private.asc"),
		"utf8"
	); // encrypted private key
	const publicKeyArmored = fs.readFileSync(
		path.join(__dirname, "../config/PGPKeys/BAOSON-PGP-public.asc"),
		"utf8"
	); // encrypted private key
	const passphrase = "12345"; // what the private key is encrypted with
	const {
		keys: [privateKey],
	} = await openPgp.key.readArmored(privateKeyArmored);
	await privateKey.decrypt(passphrase);
	const { data: cleartext } = await openPgp.sign({
		message: openPgp.cleartext.fromText("From SAPHASANBank"), // CleartextMessage or Message object
		privateKeys: [privateKey], // for signing
	});
	let data = {
		Id: "2750027628572576",
		Amount: 50000,
		Content: "nop tien",
		Fromaccount: "123456789",
		FromName: "nguyen van abc",
		ToName: "abcscas",
		feeBySender: true,
	};
	await axios({
		method: "post",
		url: "https://ptwncinternetbanking.herokuapp.com/banks/transfers", // link ngan hang muon chuyen toi
		data: data,
		headers: {
			nameBank: "SAPHASANBank",
			ts: moment().unix(),
			sig: hash(moment().unix() + data + "secretkey"),
			sigpgp: JSON.stringify(cleartext),
		},
	})
		.then(async (result) => {
			const verified = await openPgp.verify({
				message: await openPgp.cleartext.readArmored(result.data.sign),
				publicKeys: (await openPgp.key.readArmored(publicKeyArmored)).keys,
			});
			const { valid } = verified.signatures[0];
			if (valid) {
				console.log("signed by key id " + verified.signatures[0].keyid.toHex());
			} else {
				console.log("cannot verify this fucking message");
				throw new Error("cannot verify that key");
			}
		})
		.catch((err) => console.log("error: ", err));
	res.json("Successfully");
});




module.exports = router;

// "Id": "2750027628572576",
// 	"Amount":50000,
// 	"Content":"nop tien"
// "Fromaccount": "123456789"  Số tài khoản người gửi
// "FromName":"nguyen van abc",
// "ToName": "abcscas"
// "feeBySender":true or false
// router.post('/transferPGP', async (req, res) => {
// 	// let paymet = await banksModel.detail({ Iduser: req.tokenPayload.userId });
// 	const privateKeyArmored = fs.readFileSync(path.join(__dirname, '../public/myPGP/privateKeyPGP.asc'), 'utf8'); //my private key PGP
// 	const passphrase = baoson123; // what the private key is encrypted with
// 	const { keys: [privateKey] } = await openpgp.key.readArmored(privateKeyArmored);
// 	await privateKey.decrypt(passphrase);
// 	const { data: cleartext } = await openpgp.sign({
// 	  message: openpgp.cleartext.fromText("NHÓM 6"), // CleartextMessage or Message object
// 	  privateKeys: [privateKey]                     // for signing
// 	});
// 	let data = {
// 	  ...req.body,
// 	  //   Fromacount:paymet[0].Id // so tai khoan nguoi gui
// 	};
// 	try{
// 	  let result = await axios({
// 		method: 'post',
// 		url: 'https://ptwncinternetbanking.herokuapp.com/banks/transfers', // link ngan hang muon chuyen toi
// 		data: {
// 		  ...data
// 		},
// 		headers: {
// 		  nameBank: 'baoson',
// 		  ts: moment().unix(),
// 		  sig: hash(moment().unix() + data + "secretkey"),
// 		  sigpgp: JSON.stringify(cleartext)
// 		},
// 	  });
// 	  return res.status(200).json(result.data);
// 	}catch (error){
// 	  console.log("error: ", error.response.data)
// 	  throw createError(401, error.response.data.err)
// 	}
//   })


