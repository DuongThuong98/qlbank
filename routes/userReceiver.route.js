const express = require("express");
const router = express.Router();

const UserReceiverModel = require("../models/userReceiver");

router.get("/", async (req, res) => {
	const allUserReceiver = await UserReceiverModel
		.find()
		.then((data) => data)
		.catch((err) => {
			throw new Error(err);
		});

	allUserReceiver.length !== 0
		? res.json(allUserReceiver)
		: res.json({ message: "Không userReceiver" });
});

// Thêm một receiver
router.post("/", (req, res) => {
	// {
	// 	"accountNumber": "String",
	// 	"bankId": "String",
	// 	"savedName": "String",
	// }

	const allUserReceiver = new UserReceiverModel(req.body);
	allUserReceiver
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
	// 	"accountNumber": "String",
	// 	"bankId": "String",
	// 	"savedName": "String",
	// }
	const { _id, savedName} = req.body
	if (!_id) {
		return res.status(400).json({ message: "Id không được rỗng" })
	}

	if ( !savedName) {
		return res.status(400).json({ message: "Các trường không được trống" })
	}

	try {
		const allUserReceiver = await UserReceiverModel.findOne({ _id })
		if (allUserReceiver) {
			const result = await UserReceiverModel.findOneAndUpdate({ _id }, { savedName: savedName || allUserReceiver.savedName
																				 })
			if (result) {
				const data = await UserReceiverModel.findOne({ _id: result._id })
				if (data) {
					return res.status(200).json({ message: "Cập nhật thành công.", data })
				}
			}
		}
		else {
			return res.status(400).json({ message: "Không tìm thấy receiver." })
		}
	}
	catch (err) {
		console.log('err: ', err)
		return res.status(500).json({ message: "Đã có lỗi xảy ra." })
	}
});

router.delete("/", async (req, res) => {
	const { _id, savedName} = req.body
	if (!_id) {
		return res.status(400).json({ message: "Id không được rỗng" })
	}

	    try {
        const result = await UserReceiverModel.findOneAndDelete({ _id })
        if (result) {
            return res.status(200).json({ message: "Xóa receiver thành công.", data: result })
        }
        else {
            return res.status(400).json({ message: "Không tìm thấy receiver." })
        }
    }
    catch (err) {
        console.log('err: ', err)
        return res.status(500).json({ message: "Đã có lỗi xảy ra." })
    }


});


module.exports = router;


