const express = require("express");
const router = express.Router();
const { totp } = require("otplib");
const nodemailer = require("nodemailer");
const md5 = require("md5");
const config = require("../config/default.json");

const TransactionModel = require("../models/transaction.model");
const usersModel = require("../models/users.model");
const UserModel = require("../models/users.model");
const { message } = require("openpgp");

const keyOTP = "#@vevyveryOTPsecretkey@#";
const fees = 10000;
const minimumAmount = 50000;

router.post("/user-history-transactions", async (req, res) => {
	// body info
	const { accountNumber } = req.body;

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
					transactionId: trans[i]._id,
					sentUserId: trans[i].sentUserId,
					sentUserName:
						trans[i].sentUserName ||
						(users[indexSentUser] != null ? users[indexSentUser].name : null),
					sentBankId: trans[i].sentBankId,
					receivedUserId: trans[i].receivedUserId,
					receivedUserName:
						trans[i].receivedUserName ||
						(users[indexReceivedUser] != null
							? users[indexReceivedUser].name
							: null),
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

//current user is ADMIN
router.post("/deposit", async (req, res) => {
	const {
		receivedUserId,
		receivedBankId,
		receivedUserName,
		amount,
		content,
	} = req.body;
	const currentUser = req.user;

	//model
	const model = {
		sentUserId: currentUser.accountNumber,
		sentUserName: currentUser.name,
		sentBankId: currentUser.bankId ? currentUser.bankId : 0,
		receivedUserId: receivedUserId,
		receivedUserName: receivedUserName,
		receivedBankId: receivedBankId,
		isDebt: false,
		isVerified: false,
		isReceiverPaid: false,
		amount: amount,
		content: content,
	};

	console.log(req.body);

	//validate
	if (amount < minimumAmount)
		return res.status(400).json({
			message: "Amount is invalid. Please over " + minimumAmount,
		});

	var receiverUser = await UserModel.findOne({ accountNumber: receivedUserId });
	if (receiverUser == null)
		return res.status(404).json({ message: "Receiver not found" });

	//create
	TransactionModel.create(model, async (err, tran) => {
		if (err) {
			return res.status(500).json({ message: err });
		} else {
			//add amount for receiverUser balance
			receiverUser.balance = receiverUser.balance + amount;
			await receiverUser.save();

			//send mail
			var transporter = nodemailer.createTransport(
				config.emailTransportOptions
			);

			//send to receiver
			var content = "";
			content += `<div>
					<h2>Bạn đã nạp ${amount} vào tài khoản.</h2>
					<h1>Vào lúc: ${tran.createdAt} </h1>
					<p>Số dư khả dụng: ${receiverUser.balance}</p>
					</div>`;

			var mailOptions = {
				from: `huuthoigialai@gmail.com`,
				to: currentUser.email,
				subject: "Thông báo nạp tiền vào tài khoản.",
				html: content,
			};

			transporter.sendMail(mailOptions, async function (error, info) {
				if (error) {
					console.log(error);
					return res.status(400).json({ success: false });
				} else {
					tran.isVerified = true;
					await tran.save();
					console.log("Email sent: " + info.response);
					return res.json({ success: true });
				}
			});
		}
	});
});

// ----- Get all users with full information -----
router.get("/all-users", async (req, res) => {
	const findingUsers = await usersModel
		.find({ role: "customer" })
		.then((result) => result)
		.catch((err) => {
			throw new Error(err);
		});
	if (!findingUsers || findingUsers.length === 0)
		return res.status(400).json([]);

	// findingUsers.length > 0
	findingUsers.forEach((element) => {
		element.passwordHash = "";
	});
	return res.json(findingUsers);
});

// ----- Get all employees with full information -----
router.get("/employees", async (req, res) => {
	const findingUsers = await usersModel
		.find({ role: "employee" })
		.then((result) => result)
		.catch((err) => {
			throw new Error(err);
		});
	if (!findingUsers || findingUsers.length === 0)
		return res.status(400).json([]);

	// findingUsers.length > 0
	findingUsers.forEach((element) => {
		element.passwordHash = "";
	});
	return res.json(findingUsers);
});

// ----- Update status an employee info -----
router.patch("/employees/recover/:accountNumber", async (req, res) => {
	const { accountNumber } = req.params;
	let user = await usersModel.findOne({ accountNumber: accountNumber });
	user.status = true;

	await user.save();

	return res.send(user);
});

// ----- Delete an employee info -----
router.delete("/employees/:accountNumber", async (req, res) => {
	const { accountNumber } = req.params;
	let user = await usersModel.findOne({ accountNumber: accountNumber });
	user.status = false;

	await user.save();

	return res.send(user);
});

router.get("/transactions", async (req, res) => {
	var data = [];

	let sumMoney = 0;

	var transactions = await TransactionModel.find({
		$where: "sentBankId != receivedBankId",
	});
	if (transactions != null && transactions.length > 0) {
		for (let i = 0; i < transactions.length; i++) {
			sumMoney = +sumMoney + transactions[i].amount;
			var o = {
				sentUserId: transactions[i].sentUserId,
				sentUserName: transactions[i].sentUserName,
				sentBankId: transactions[i].sentBankId,
				receivedUserId: transactions[i].receivedUserId,
				receivedUserName: transactions[i].receivedUserName,
				receivedBankId: transactions[i].receivedBankId,
				isDebt: transactions[i].isDebt,
				isReceiverPaid: transactions[i].isReceiverPaid,
				amount: transactions[i].amount,
				content: transactions[i].content,
				isVerified: transactions[i].isVerified,
				updatedAt: transactions[i].updatedAt,
			};
			data.push(o);
		}
		return res.json({ data: data, money: sumMoney });
	}
});

module.exports = router;
