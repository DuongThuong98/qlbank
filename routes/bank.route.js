const express = require("express");
const router = express.Router();

const bankModel = require("../models/bank.model");

router.get("/", async (req, res) => {
	const allBanks = await bankModel
		.find()
		.then((data) => data)
		.catch((err) => {
			throw new Error(err);
		});

	allBanks.length !== 0
		? res.json(allBanks)
		: res.json({ message: "Không có ngân hàng liên kết." });
});

// Thêm một ngân hàng đã liên kết
router.post("/", (req, res) => {
	// {
	// 	"bankId": 1,
	// 	"name": "HuuTienBank",
	// 	"partnerCode": "huuTien123",
	// 	"method": "rsa",
	// 	"partnerPublicKey": "-----BEGIN PUBLIC KEY-----MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCyceITLtFoy4KzMgmr6NEnvk1VBH7pRuyyg7IkXc3kBspKs9CIErm2eJtEtduIPQK+3AgiQW+fjL1dDMQr7ENZiGzWhEPoSbU348mjg1fxFDztFB4QiqAd7UUvj1kK2/UT+D0C6Sgc0O69C9lRGahPSAX+7ZArGIodtfuOKPenEwIDAQAB-----END PUBLIC KEY-----",
	// }

	const bank = new bankModel(req.body);
	bank
		.save()
		.then((userData) => {
			return res.json(userData);
		})
		.catch((err) => {
			throw new Error(err);
		});
});

module.exports = router;
