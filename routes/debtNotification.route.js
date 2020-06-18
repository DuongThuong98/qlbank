const express = require("express");
const router = express.Router();

const DebtNotificationModel = require("../models//debtNotification.model");


//GET 
router.get("/", async (req, res) => {
	const debt = await DebtNotificationModel
		.find()
		.then((data) => data)
		.catch((err) => {
			throw new Error(err);
		});

	debt.length !== 0
		? res.json(allUserReceiver)
		: res.json({ message: "Không có nhắc nợ nào" });
});

router.get("/have-not-paid-debt", async (req, res) => {
	const user = req.user;

	const debt = await DebtNotificationModel
		.find({ $and : [
			{ $or : [ { sentUserId: user._id }, {receivedUserId: user._id} ] },
			{ status : 0 }
		] })
		.then((data) => data)
		.catch((err) => {
			throw new Error(err);
		});

	debt.length !== 0
		? res.json(debt)
		: res.json({ message: "Không có nhắc nợ nào" });
});

router.get("/debting", async (req, res) => {
	const user = req.user;

	const debt = await DebtNotificationModel
		.find({sentUserId: user._id})
		.then((data) => data)
		.catch((err) => {
			throw new Error(err);
		});

	debt.length !== 0
		? res.json(debt)
		: res.json({ message: "Không có nhắc nợ nào" });
});

router.get("/debted", async (req, res) => {
	const user = req.user;

	const debt = await DebtNotificationModel
		.find({receivedUserId: user._id})
		.then((data) => data)
		.catch((err) => {
			throw new Error(err);
		});

	debt.length !== 0
		? res.json(debt)
		: res.json({ message: "Không có nhắc nợ nào" });
});

// Thêm một Giao dịch
router.post("/", (req, res) => {
	// {
	// 	"sentUserId": "String",
	// 	"sentBankId": "String",
	// 	"receivedUserId": "String",
	// 	"receivedBankId": "String",
	// 	"updatedBySentUser": Number, // default là -1, nếu người nhắc xoá thì là 1, 
	//nếu người nợ xoá/trả nợ thì là 0.
	// Dùng để gửi feedbackContent cho người nhắc hoặc người nợ
	// 	"status": Number, // paid, delete, pending... (1,2,3,4)
	// 	"amount": Number, // 500000
	// 	"debtContent": "String", // "Trả tiền ăn cơm hôm qua đi chứ!"
	// 	"feedbackContent": "String" // "Okay nha" / "Ủa hôm đó trả rồi mà ta?"
	// }
	
	const newDebt = new DebtNotificationModel(req.body);
	newDebt
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
		const allUserTrans = await DebtNotificationModel.findOne({ _id })
		if (allUserTrans) {
			const result = await DebtNotificationModel.findOneAndUpdate({ _id }, {
				content: content || allUserTrans.content,
				isDebt: isDebt || allUserTrans.isDebt
			})
			if (result) {
				const data = await DebtNotificationModel.findOne({ _id: result._id })
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
		const result = await DebtNotificationModel.findOneAndDelete({ _id })
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

////////


module.exports = router;


