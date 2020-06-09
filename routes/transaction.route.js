const express = require("express");
const router = express.Router();

const TransactionModel = require("../models/transaction.model");

router.get("/", async (req, res) => {
	const allUserTrans = await TransactionModel
		.find()
		.then((data) => data)
		.catch((err) => {
			throw new Error(err);
		});

	allUserTrans.length !== 0
		? res.json(allUserReceiver)
		: res.json({ message: "Không giao dịch nào" });
});

// Thêm một Giao dịch
router.post("/", (req, res) => {
	// {
	// 	"sentUserId": "Number",
	// 	"sentBankId": "Number",
	// 	"receivedUserId": "Number",
	// 	"receivedBankId": "Number",
	// 	"isDebt": false, // Có phải trả nợ không?
	// 	"isReceiverPaid": true, // Người nhận trả phí giao dịch? => True: người nhận trả, false: người gửi trả.
	// 	"amount": 10000,
	// 	"content": "Thông tin trả nợ",
	// 	"signature": "Chữ kỹ ở này",
	// }
	const allUserTrans = new TransactionModel(req.body);
	allUserTrans
		.save()
		.then((data) => {
			return res.json(data);
		})
		.catch((err) => {
			throw new Error(err);
		});
});

router.patch("/", async (req, res) => {
	const { _id, isDebt, content } = req.body
	if (!_id) {
		return res.status(400).json({ message: "Id không được rỗng" })
	}

	if (!content) {
		console.log(isDebt + " fwf " + content)
		return res.status(400).json({ message: "Các trường không được trống" })
	}

	try {
		const allUserTrans = await TransactionModel.findOne({ _id })
		if (allUserTrans) {
			const result = await TransactionModel.findOneAndUpdate({ _id }, {
				content: content || allUserTrans.content,
				isDebt: isDebt || allUserTrans.isDebt
			})
			if (result) {
				const data = await TransactionModel.findOne({ _id: result._id })
				if (data) {
					return res.status(200).json({ message: "Cập nhật thành công.", data })
				}
			}
		}
		else {
			return res.status(400).json({ message: "Không tìm thấy giao dịch này." })
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
		const result = await TransactionModel.findOneAndDelete({ _id })
		if (result) {
			return res.status(200).json({ message: "Xóa giao dịch thành công.", data: result })
		}
		else {
			return res.status(400).json({ message: "Không tìm thấy giao dịch này." })
		}
	}
	catch (err) {
		console.log('err: ', err)
		return res.status(500).json({ message: "Đã có lỗi xảy ra." })
	}


});


module.exports = router;


