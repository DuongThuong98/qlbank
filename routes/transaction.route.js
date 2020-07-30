const express = require("express");
const router = express.Router();
const { totp } = require("otplib");
const nodemailer = require("nodemailer");
const md5 = require("md5");
const moment = require("moment");
const config = require("../config/default.json");

const TransactionModel = require("../models/transaction.model");
const UserModel = require("../models/users.model");
const Notification = require("../models/notification.model");
const DebtNotification = require("../models/debtNotification.model");

const { message } = require("openpgp");

const keyOTP = "#@vevyveryOTPsecretkey@#";
const fees = 1000;
const minimumAmount = 1000;
let notificationTitle = "";
let notificationContent = "";

const { moneyFormatter } = require("../helpers/helpers");

router.get("/history", async (req, res) => {
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
	TransactionModel.find({
		isVerified: true,
		$or: [{ sentUserId: accountNumber }, { receivedUserId: accountNumber }],
	}).exec(function (err, trans) {
		if (err) {
			return res.status(500).json({ message: err });
		} else {
			for (let i = 0; i < trans.length; i++) {
				// let us = users.findOne((x) => x.accountNumber === trans[i].sentUserId);
				const indexSentUser = users.findIndex((x) => {
					if (x.accountNumber === trans[i].sentUserId) return true;
					return false;
				});
				const indexReceivedUser = users.findIndex((x) => {
					if (x.accountNumber === trans[i].receivedUserId) return true;
					return false;
				});
				// let ur = users.findOne(
				// 	(x) => x.accountNumber === trans[i].receivedUserId
				// );
				var obj = {
					sentUserId: trans[i].sentUserId,
					sentUserName:
						users[indexSentUser] != null ? users[indexSentUser].name : null,
					sentBankId: trans[i].sentBankId,
					receivedUserId: trans[i].receivedUserId,
					receivedUserName:
						users[indexReceivedUser] != null
							? users[indexReceivedUser].name
							: null,
					receivedBankId: trans[i].receivedBankId,
					isDebt: trans[i].isDebt,
					isReceiverPaid: trans[i].isReceiverPaid,
					amount: trans[i].amount,
					content: trans[i].content,
					createdAt: trans[i].createdAt,
				};

				data.push(obj);
			}
		}
		return res.json({ data: data });
	});

	//return result
});

router.get("/", async (req, res) => {
	const allUserTrans = await TransactionModel.find()
		.then((data) => data)
		.catch((err) => {
			throw new Error(err);
		});

	allUserTrans.length !== 0
		? res.json(allUserReceiver)
		: res.json({ message: "Không giao dịch nào" });
});

// Thêm một Giao dịch
//input: model 	//	"sentUserId": "Number",
// 	"sentBankId": "Number",
// 	"receivedUserId": "Number",
// 	"receivedBankId": "Number",
// 	"isDebt": false, // Có phải trả nợ không?
// 	"isReceiverPaid": true, // Người nhận trả phí giao dịch? => True: người nhận trả, false: người gửi trả.
// 	"amount": 10000,
//	isVerified: Boolean
// 	"content": "Thông tin trả nợ",
// 	"signature": "Chữ kỹ ở này",
// }
//out put : otp code
router.post("/", (req, res) => {
	const {
		receivedUserId,
		receivedUserName,
		receivedBankId,
		isDebt,
		isReceiverPaid,
		amount,
		content,
		signature,
	} = req.body;
	console.log(req.body);

	const currentUser = req.user;
	console.log(req.user);

	//add new transaction
	const model = {
		sentUserId: currentUser.accountNumber,
		sentUserName: currentUser.name,
		sentBankId: currentUser.bankId ? currentUser.bankId : 0,
		receivedUserId: receivedUserId,
		receivedUserName: receivedUserName,
		receivedBankId: receivedBankId,
		isDebt: isDebt,
		isVerified: false,
		isReceiverPaid: isReceiverPaid,
		amount: amount,
		content: content,
		signature: receivedBankId === 0 ? "" : signature,
	};

	if (amount < minimumAmount)
		return res.status(400).json({
			message: "Amount is invalid. Please over " + minimumAmount,
		});

	TransactionModel.create(model, async (err, tran) => {
		if (err) {
			return res.status(500).json({ message: err });
		} else {
			//create successfully => create otp code
			totp.options = { step: 300, digits: 8 };
			var key = keyOTP + currentUser.id;
			const code = totp.generate(key);

			tran.transactionIdCode = md5(tran._id + code);
			tran.code = code;
			await tran.save();

			//send mail
			var transporter = nodemailer.createTransport(
				config.emailTransportOptions
			);

			var content = "";
			content += `<div>
        <h2>Use the code below to verify information </h2>
				<h1> ${code}</h1>
				<p>This code will be expired after 5 minutes!</p>
				</div>  
		`;

			var mailOptions = {
				from: `huuthoigialai@gmail.com`,
				to: currentUser.email,
				subject: "Gửi Mã OTP",
				html: content,
			};

			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					console.log(error);
					return res.status(400).json({ message: "Không thể gửi mail" });
				} else {
					console.log("Email sent: " + info.response);
					return res.json({
						message: `Gửi Otp thành công ${code}`,
						data: { transactionId: tran._id, createdAt: tran.createdAt },
					});
				}
			});
		}
	});
});

router.post("/verify-code", async (req, res) => {
	const { code } = req.body;
	const currentUserId = req.user._id;

	var currentUser = await UserModel.findOne({
		_id: currentUserId,
	});

	const transactionId = req.get("transactionId");
	const debtId = req.get("debtId");

	if (transactionId == null) {
		return res.status(400).json({ message: "Invalid transactionId!" });
	}
	const isValid = totp.check(code, keyOTP + currentUser._id);
	if (!isValid) return res.status(400).json({ message: "Invalid code!" });

	const tran = await TransactionModel.findById({ _id: transactionId });

	if (tran == null)
		return res.status(404).json({ message: "Not found transaction!" });

	var receiverUser = await UserModel.findOne({
		accountNumber: tran.receivedUserId,
	});
	if (receiverUser == null)
		return res.status(404).json({ message: "Receiver not found" });

	//kiem tra nguoi  gui co du tien gui hay khong ||
	if (currentUser.balance - tran.amount <= minimumAmount) {
		return res.status(400).json({ message: "Not enough money" });
	}

	if (tran.isReceiverPaid) {
		receiverUser.balance = receiverUser.balance + tran.amount - fees;
		await receiverUser.save();

		currentUser.balance = currentUser.balance - tran.amount;
		await currentUser.save();
	} else {
		//kiem tra xem so du sua khi chuyen co lon hon 1000 ko?
		if (currentUser.balance - tran.amount - fees <= minimumAmount) {
			return res.status(400).json({ message: "Not enough money" });
		}
		receiverUser.balance = receiverUser.balance + tran.amount;
		await receiverUser.save();

		currentUser.balance = currentUser.balance - tran.amount - fees;
		await currentUser.save();
	}

	if (debtId != null) {
		const debtRecord = await DebtNotification.findById({ _id: debtId });
		if (debtRecord === null)
			return res.status(404).json({ message: "Not found this Debt Id" });

		debtRecord.updatedBySentUser = 0;
		debtRecord.status = "paid";
		await debtRecord.save();

		tran.isDebt = true;
	}

	var messageNotify;
	if (tran.isDebt) {
		messageNotify = "Trả nợ";
		notificationTitle = `${currentUser.name.toUpperCase()} đã trả nợ cho bạn`;
		notificationContent = `Bạn được thanh toán nợ ${moneyFormatter.format(
			tran.amount
		)} bởi ${currentUser.name.toUpperCase()} vào lúc ${new Date(
			tran.createdAt
		)} với thông điệp "${tran.content}"`;
	} else {
		messageNotify = "Chuyển tiền";
		notificationTitle = `${currentUser.name.toUpperCase()} đã chuyển tiền cho bạn`;
		notificationContent = `Bạn nhận được ${moneyFormatter.format(
			tran.amount
		)} từ ${currentUser.name.toUpperCase()} trong ngày ${new Date(
			tran.createdAt
		)} với thông điệp "${tran.content}"`;
	}

	// Notification to user(include receiver and sender)
	// when transaction created, add notification
	let notifyModel = {
		notificationTitle: notificationTitle,
		notificationContent: notificationContent,
		fromUserId: tran.sentUserId,
		fromBankId: tran.sentBankId,
		toUserId: tran.receivedUserId,
		toBankId: tran.receivedBankId,
		isSent: false,
		ts: moment().unix(),
	};

	await Notification.create(notifyModel, (err, notify) => {
		if (err) {
			return res.status(400).json({ message: err });
		} else {
			console.log(notify);
		}
	});

	// Update transaction
	tran.isVerified = true;
	await tran.save();

	res.status(200).json({ message: "Giao dịch thành công!" });
});

//should the transaction be updated?
router.patch("/", async (req, res) => {
	const { _id, isDebt, content } = req.body;
	if (!_id) {
		return res.status(400).json({ message: "Id không được rỗng" });
	}

	if (!content) {
		console.log(isDebt + " fwf " + content);
		return res.status(400).json({ message: "Các trường không được trống" });
	}

	try {
		const allUserTrans = await TransactionModel.findOne({ _id });
		if (allUserTrans) {
			const result = await TransactionModel.findOneAndUpdate(
				{ _id },
				{
					content: content || allUserTrans.content,
					isDebt: isDebt || allUserTrans.isDebt,
				}
			);
			if (result) {
				const data = await TransactionModel.findOne({ _id: result._id });
				if (data) {
					return res
						.status(200)
						.json({ message: "Cập nhật thành công.", data });
				}
			}
		} else {
			return res.status(400).json({ message: "Không tìm thấy giao dịch này." });
		}
	} catch (err) {
		console.log("err: ", err);
		return res.status(500).json({ message: "Đã có lỗi xảy ra." });
	}
});

router.delete("/", async (req, res) => {
	const { _id } = req.body;
	if (!_id) {
		return res.status(400).json({ message: "Id không được rỗng" });
	}

	try {
		const result = await TransactionModel.findOneAndDelete({ _id });
		if (result) {
			return res
				.status(200)
				.json({ message: "Xóa giao dịch thành công.", data: result });
		} else {
			return res.status(400).json({ message: "Không tìm thấy giao dịch này." });
		}
	} catch (err) {
		console.log("err: ", err);
		return res.status(500).json({ message: "Đã có lỗi xảy ra." });
	}
});

////////
module.exports = router;
