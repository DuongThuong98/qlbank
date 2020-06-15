const express = require("express");
const router = express.Router();

const UserReceiverModel = require("../models/userReceiver");
const usersModel = require("../models/users.model");
const bankModel = require("../models/bank.model");

//GET receiver list
router.get("/all-receiver-list", async (req, res) => {
	try {
		const user = req.user;
		if (user) {
			recs = user.receivers;
			for(i=0;i< recs.length;i++)
			{
				if(recs[i].bankId == 0)
				{
					recs[i].bankName = "Nội bộ"
				}
				else{
					bank = await bankModel.findOne({bankId: 1 })

					console.log(bank)
					recs[i].bankName = bank.name;
				}
			}
			return res.status(200).json({ data: user.receivers });
		} else {
			return res
				.status(400)
				.json({ message: "Khách hàng chưa đăng nhập." });
		}
	} catch (err) {
		console.log("err: ", err);
		return res.status(500).json({ message: "Đã có lỗi xảy ra." });
	}
});

router.post("/one-receiver-list", async (req, res) => {
	// {
	// 	"accountNumber": "00000003",
	//     "_id": "5ee2430bc2b4724218e7d1ea"
	// }
	const { _id} = req.user;
	const { accountNumber } = req.body;
	try {
		const user = await usersModel.findOne({ _id });
		const recs = user.receivers;
		if (user) {
			let flag = 0;
			recs.forEach((rec) => {
				if (rec.accountNumber == accountNumber) {
					flag = 1;
					return res.status(200).json({ data: rec });
				}
			});
			if (flag == 0) {
				return res
					.status(400)
					.json({ message: "Không tìm thấy receiver này." });
			}
		} else {
			return res
				.status(400)
				.json({ message: "Không tìm thấy khách hàng này." });
		}
	} catch (err) {
		console.log("err: ", err);
		return res.status(500).json({ message: "Đã có lỗi xảy ra." });
	}
});

//ADD receiver
router.post("/receiver-list", async (req, res) => {
	// {
	// 	"receiver": {
	// 		"accountNumber": "5edb5f2d9bd2c03f1c410814",
	// 		"bankId": 0,
	// 		"savedName": "Thuong"
	// 		"realName": "RealName"
	// 	},

	const { receiver } = req.body
	console.log(receiver)
	try {
		const user = req.user;
		if (user) {
			let newReceivers = user.receivers;
			// console.log(user)
			console.log(newReceivers)
			let flag = 0;
			newReceivers.forEach((rec) => {
				if (
					rec.accountNumber === receiver.accountNumber ||
					rec.savedname === receiver.savedName ||
					rec.realName === receiver.realName
				) {
					flag = 1;
					// if(rec.realName === receiver.realName)
					
				}
			});

			console.log(flag)

			if (flag == 0) {
				console.log("sai")
				newReceivers.push(receiver);
				const result = await usersModel.findOneAndUpdate(
					{ _id: user._id },
					{
						receivers: newReceivers || user.receivers,
					}
				);
				if (result) {
					const data = await usersModel.findOne({ _id: result._id });
					if (data) {
						return res
							.status(200)
							.json({ message: "Cập nhật thành công.", data });
					}
				}
			}
			else
			{
				return res
						.status(400)
						.json({ message: "Trùng tài khoản hoặc tên lưu trữ" });
			}
			// return res.status(400).json({ message: "TEST" })
		} else {
			return res
				.status(400)
				.json({ message: "Không tìm thấy khách hàng này." });
		}
	} catch (err) {
		console.log("err: ", err);
		return res.status(500).json({ message: "Đã có lỗi xảy ra." });
	}
});


module.exports = router;


