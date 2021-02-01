const express = require("express");
const router = express.Router();
const { totp } = require("otplib");
const nodemailer = require("nodemailer");
const md5 = require("md5");
const config = require("../config/default.json");

const TransactionModel = require("../models/transaction.model");
const UserModel = require("../models/users.model");
const { message } = require("openpgp");
const DebtNotification = require("../models/debtNotification.model");

const keyOTP = "#@vevyveryOTPsecretkey@#";
const fees = 1000;
const minimumAmount = 1000;
const notificationTitleString = "Thông tin chuyển tiền";

router.post("/:id", async (req, res) => {
	//prepare data
	const { content } = req.body;
	const currentUser = req.user;
	const { id } = req.params;

	//find and check condition
	const debt = await DebtNotification.findById({ _id: id });
	if (debt === null) return res.status(404).json({ message: "Not found" });
	debt.feedbackContent = content;
	await debt.save();

	if (currentUser.accountNumber !== debt.receivedUserId)
		return res.status(403).json({ message: "Invalid user" });

	// **TODO: Kiểm tra transactionId trong debt này đã có hay chưa? Chưa thì tạo thêm, còn có rồi thì lấy transaction này để update và lưu vào model debt

	//add new transaction - debt pay
	const model = {
		sentUserId: debt.receivedUserId,
		sentBankId: debt.receivedBankId ? debt.receivedBankId : 0,
		receivedUserId: debt.sentUserId,
		receivedBankId: debt.sentBankId,
		isDebt: true,
		isVerified: false,
		isReceiverPaid: false,
		amount: debt.amount,
		content: content,
		signature: debt.receivedBankId === 0 ? "" : "signature", //the signature is tem, check it, plz
	};

	if (debt.amount < minimumAmount)
		return res.status(400).json({
			message: "Amount is invalid. Please over " + minimumAmount,
		});

	//create
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

router.post("/:id/verify-code", async (req, res) => {
	var messageNotify = "Trả nợ";

	//prepare data
	const { code } = req.body;
	const currentUserId = req.user._id;
	const { id } = req.params.id;

	//find and check exist
	var currentUser = await UserModel.findOne({
		accountNumber: currentUserId,
	});

	const debt = await DebtNotification.findById({ _id: id });
	if (debt === null) return res.status(404).json({ message: "Not found" });

	if (currentUser._id !== debt.receivedUserId)
		return res.status(403).json({ message: "Invalid user" });

	//get transactionId from header: is the same transaction.route
	const transactionId = req.get("transactionId");
	if (transactionId == null) {
		return res.status(400).json({ message: "Invalid transactionId!" });
	}

	//validate code
	const isValid = totp.check(code, keyOTP + currentUser._id);
	if (!isValid) return res.status(400).json({ message: "Invalid code!" });

	//find tran
	const tran = await TransactionModel.findById({ _id: transactionId });
	if (tran == null)
		return res.status(404).json({ message: "Not found transaction!" });

	//find receiver
	var receiverUser = await UserModel.findOne({
		accountNumber: tran.receivedUserId,
	});
	if (receiverUser == null)
		return res.status(404).json({ message: "Receiver not found" });

	//check balance current user amount
	if (currentUser.balance - tran.amount <= minimumAmount) {
		return res.status(400).json({ message: "Not enough money" });
	}

	//kiem tra xem so du sua khi chuyen co lon hon minimumAmount ko?
	if (currentUser.balance - tran.amount - fees <= minimumAmount) {
		return res.status(400).json({ message: "Not enought money" });
	}
	receiverUser.balance = receiverUser.balance + tran.amount;
	await receiverUser.save();

	currentUser.balance = currentUser.balance - tran.amount - fees;
	await currentUser.save();

	//Notification to user(include receiver and sender)
	//when transaction created, add notification
	let notifyModel = {
		notificationTitle: notificationTitleString,
		notificationContent: tran.content ? tran.content : null,
		fromUserId: tran.sentUserId,
		fromBankId: tran.fromBankId,
		toUserId: tran.toUserId,
		toBankId: tran.toBankId,
		isSent: false,
	};

	//create notify
	Notification.create(notifyModel, (err, notify) => {
		if (err) {
			return res.status(400).json({ message: err });
		} else {
			console.log(notify);
		}
	});

	//send to current user
	var transporter = nodemailer.createTransport(config.emailTransportOptions);
	var content = "";
	content += `<div>
  <h2>You have been sent ${tran.amount} to ${receiverUser.username}</h2>
  <h1>Type: ${messageNotify}</h1>
  <p>Reason: ${tran.content}</p>
  <p>Your balance: ${currentUser.balance}</p>
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
			return res.status(400).json({ success: false });
		} else {
			console.log("Email sent: " + info.response);
			return res.json({ success: true });
		}
	});

	//send to receiver
	var transporter2 = nodemailer.createTransport(config.emailTransportOptions);
	var content2 = "";
	content2 += `<div>
  <h2>You have been paid ${tran.amount} from ${currentUser.username}</h2>
  <h1>Reason: ${message}</h1>
  <p>Your balance: ${receiverUser.balance}</p>
  </div>  
`;
	var mailOptions2 = {
		from: `huuthoigialai@gmail.com`,
		to: currentUser.email,
		subject: "Gửi Mã OTP",
		html: content,
	};
	transporter2.sendMail(mailOptions2, function (error, info) {
		if (error) {
			console.log(error);
			return res.status(400).json({ success: false });
		} else {
			console.log("Email sent: " + info.response);
			return res.json({ success: true });
		}
	});

	//updaate status trans
	tran.isVerified = true;
	await tran.save();

	//update debt status
	debt.status = "paid";
	await debt.save();
});

////////
module.exports = router;
