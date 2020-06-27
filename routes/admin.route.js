const express = require("express");
const router = express.Router();
const { totp } = require("otplib");
const nodemailer = require("nodemailer");
const md5 = require("md5");
const config = require("../config/default.json");

const TransactionModel = require("../models/transaction.model");
const UserModel = require("../models/users.model");
const { message } = require("openpgp");

const keyOTP = "#@vevyveryOTPsecretkey@#";
const fees = 10000;
const minimumAmount = 50000;

router.post("/user-history-transaction-", async (req, res) => {
  // body info
  const { accountNumber } = req.body;

  //get users
  const users = UserModel.find()
    .then((data) => data)
    .catch((err) => {
      throw new Error(err);
    });

  //check user exist?
  var user = await users.findOne((x) => x.accountNumber === accountNumber);
  if (user == null) {
    return res.status(404).json({ message: "Not found user" });
  }

  //define data to return
  var data = [];
  TransactionModel.find({
    $or: [{ sentUserId: accountNumber }, { receivedUserId: accountNumber }],
  }).exec(function (err, trans) {
    if (err) {
      return res.status(500).json({ message: err });
    } else {
      for (let i = 0; i < trans.length; i++) {
        let us = users.findOne((x) => x.accountNumber === trans[i].sentUserId);
        let ur = users.findOne(
          (x) => x.accountNumber === trans[i].receivedUserId
        );
        var obj = {
          sentUserId: trans[i].sentUserId,
          sentUsername: us != null ? us.name : null,
          sentBankId: trans[i].sentBankId,
          receivedUserId: ur != null ? ur.name : null,
          receivedBankId: trans[i].receivedBankId,
          isDebt: trans[i].isDebt,
          isReceiverPaid: trans[i].isReceiverPaid,
          amount: trans[i].amount,
          content: trans[i].content,
        };
        data.push(obj);
      }
    }
  });

  //return result
  return res.json({ data: data });
});

//current user is ADMIN
router.post("/deposit", async (req, res) => {
	const { receivedUserId, receivedBankId, amount, content } = req.body;
	const currentUser = req.user;

	//model
	const model = {
		sentUserId: currentUser.accountNumber,
		sentBankId: currentUser.bankId ? currentUser.bankId : 0,
		receivedUserId: receivedUserId,
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

module.exports = router;
