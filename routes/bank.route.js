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
		.then((data) => {
			return res.json(data);
		})
		.catch((err) => {
			throw new Error(err);
		});
});

router.patch("/", async (req, res) => {
	// {
	// 	"bankId": 1,
	// 	"name": "HuuTienBank",
	// 	"partnerCode": "huuTien123",
	// 	"method": "rsa",
	// 	"partnerPublicKey": "-----BEGIN PUBLIC KEY-----MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCyceITLtFoy4KzMgmr6NEnvk1VBH7pRuyyg7IkXc3kBspKs9CIErm2eJtEtduIPQK+3AgiQW+fjL1dDMQr7ENZiGzWhEPoSbU348mjg1fxFDztFB4QiqAd7UUvj1kK2/UT+D0C6Sgc0O69C9lRGahPSAX+7ZArGIodtfuOKPenEwIDAQAB-----END PUBLIC KEY-----",
	// }

	const { _id, bankId, name,partnerCode,method,
		partnerPublicKey } = req.body
	if (!_id) {
		return res.status(400).json({ message: "Id không được rỗng" })
	}

	
	try {
		const bank = await bankModel.findOne({ _id })
		if (bank) {
			const result = await bankModel.findOneAndUpdate({ _id }, {
				bankId: bankId || bank.bankId,
				name: name || bank.name,
				partnerCode: partnerCode || bank.partnerCode,
				method: method || bank.method,
				partnerPublicKey: partnerPublicKey || bank.partnerPublicKey
			})
			if (result) {
				const data = await bankModel.findOne({ _id: result._id })
				if (data) {
					return res.status(200).json({ message: "Cập nhật thành công.", data })
				}
			}
		}
		else {
			return res.status(400).json({ message: "Không tìm thấy ngân hàng này." })
		}
	}
	catch (err) {
		console.log('err: ', err)
		return res.status(500).json({ message: "Đã có lỗi xảy ra." })
	}
});

router.delete("/", async (req, res) => {
	const { _id } = req.body
	if (!_id) {
		return res.status(400).json({ message: "Id không được rỗng" })
	}

	try {
		const result = await bankModel.findOneAndDelete({ _id })
		if (result) {
			return res.status(200).json({ message: "Xóa giao dịch thành công.", data: result })
		}
		else {
			return res.status(400).json({ message: "Không tìm thấy ngân hàng này." })
		}
	}
	catch (err) {
		console.log('err: ', err)
		return res.status(500).json({ message: "Đã có lỗi xảy ra." })
	}


});


module.exports = router;
