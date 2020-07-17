const express = require("express");
const router = express.Router();

const NotificationModel = require("../models/notification.model");
const UserModel = require("../models/users.model");
const moment = require("moment");

const keyOTP = "#@vevyveryOTPsecretkey@#";
const fees = 1000;
const minimumAmount = 1000;

// STATIC
router.get("/history-all", async (req, res) => {
	const { accountNumber } = req.user;

	// Lấy dữ liệu 1 lần tất cả users, ko cần đụng db nhiều
	const users = await UserModel.find();

	//check user exist?
	var userIndex = users.findIndex((x) => {
		if (x.accountNumber === accountNumber) return true;
		return false;
	});
	if (userIndex === -1) {
		return res.status(404).json({ message: "Not found user" });
	}

	//define data to return
	var data = [];
	NotificationModel.find({ toUserId: accountNumber }).exec(function (
		err,
		notifications
	) {
		if (err) {
			return res.status(500).json({ message: err });
		} else {
			console.log(accountNumber);
			for (let i = 0; i < notifications.length; i++) {
				// let us = users.findOne((x) => x.accountNumber === trans[i].sentUserId);
				const indexFromUser = users.findIndex((x) => {
					if (x.accountNumber === notifications[i].fromUserId) return true;
					return false;
				});
				const indexToUser = users.findIndex((x) => {
					if (x.accountNumber === notifications[i].toUserId) return true;
					return false;
				});
				// let ur = users.findOne(
				// 	(x) => x.accountNumber === trans[i].receivedUserId
				// );
				var obj = {
					fromUserId: notifications[i].fromUserId,
					fromUserName:
						users[indexFromUser] != null ? users[indexFromUser].name : null,
					fromBankId: notifications[i].fromBankId,
					toUserId: notifications[i].toUserId,
					toUserName:
						users[indexToUser] != null ? users[indexToUser].name : null,
					toBankId: notifications[i].toBankId,
					isSent: notifications[i].isSent,
					notificationContent: notifications[i].notificationContent,
					notificationTitle: notifications[i].notificationTitle,
					createdAt: notifications[i].createdAt,
				};

				data.push(obj);
			}
		}
		return res.json({ data: data });
	});
});

// LONGPOLLING
router.get("/history", async (req, res) => {
	const { ts } = req.query;
	const { accountNumber, username } = req.user;

	// ** TODO: TẠO BẢNG USERS ONLINE => CHECK ĐÃ ONLINE THÌ KHÔNG CHẠY HÀM => TRẢ VỀ 500
	// ** NẾU CHƯA ONLINE THÌ SET ONLINE VÀ CHẠY LONGPOLLING

	// Lấy dữ liệu 1 lần tất cả users, ko cần đụng db nhiều
	const users = await UserModel.find();

	//check user exist?
	var userIndex = users.findIndex((x) => {
		if (x.accountNumber === accountNumber) return true;
		return false;
	});
	if (userIndex === -1) {
		return res
			.status(404)
			.json({ message: "Not found user or this user has been online already" });
	}

	let loop = 0;
	const fn = () => {
		var data = [];
		const timestampToDateTime = Date(+ts);
		console.log(timestampToDateTime);
		NotificationModel.find({
			$and: [{ toUserId: accountNumber }, { ts: { $gte: ts } }],
		}).exec(function (err, notifications) {
			if (err) {
				return res.status(500).json({ message: err });
			} else {
				if (notifications.length > 0) {
					for (let i = 0; i < notifications.length; i++) {
						// let us = users.findOne((x) => x.accountNumber === trans[i].sentUserId);
						const indexFromUser = users.findIndex((x) => {
							if (x.accountNumber === notifications[i].fromUserId) return true;
							return false;
						});
						const indexToUser = users.findIndex((x) => {
							if (x.accountNumber === notifications[i].toUserId) return true;
							return false;
						});
						// let ur = users.findOne(
						// 	(x) => x.accountNumber === trans[i].receivedUserId
						// );
						var obj = {
							fromUserId: notifications[i].fromUserId,
							fromUserName:
								users[indexFromUser] != null ? users[indexFromUser].name : null,
							fromBankId: notifications[i].fromBankId,
							toUserId: notifications[i].toUserId,
							toUserName:
								users[indexToUser] != null ? users[indexToUser].name : null,
							toBankId: notifications[i].toBankId,
							isSent: notifications[i].isSent,
							notificationContent: notifications[i].notificationContent,
							notificationTitle: notifications[i].notificationTitle,
							createdAt: notifications[i].createdAt,
							ts: notifications[i].ts,
						};

						data.push(obj);
					}
					return res
						.status(200)
						.json({ return_ts: moment().unix(), data: data });
				} else {
					loop++;
					console.log(`user: ${username}, loop: ${loop}`);
					if (loop < 4) {
						setTimeout(fn, 2500);
					} else {
						return res.status(204).send("NO DATA");
					}
				}
			}
		});
	};
	fn();
	//define data to return

	//return result
});

module.exports = router;
