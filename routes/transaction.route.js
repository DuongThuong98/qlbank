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
    sentUserId: currentUser.id,
    sentBankId: currentUser.bankId ? currentUser.bankId : 0,
    receivedUserId: receivedUserId,
    receivedBankId: receivedBankId,
    isDebt: isDebt,
    isVerified: false,
    isReceiverPaid: isReceiverPaid,
    amount: amount,
    content: content,
    signature: (bankId = 0 ? "" : signature),
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
            message: "Gửi Otp thành công",
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
  console.log(req.get("transactionId"));

  if (transactionId == null) {
    return res.status(400).json({ message: "Invalid transactionId!" });
  }
  const isValid = totp.check(code, keyOTP + currentUser._id);
  if (!isValid) return res.status(400).json({ message: "Invalid code!" });

  const tran = await TransactionModel.findById({ _id: transactionId });

  console.log(tran);

  if (tran == null)
    return res.status(404).json({ message: "Not found transaction!" });

  var receiverUser = await UserModel.findOne({
    accountNumber: tran.receivedUserId,
  });
  if (receiverUser == null)
    return res.status(404).json({ message: "Receiver not found" });

  if (currentUser.balance - tran.amount <= minimumAmount) {
    return res.status(400).json({ message: "Not enough money" });
  }

  //kiem tra nguoi  gui co du tien gui hay khong ||
  if (tran.isReceiverPaid) {
    receiverUser.balance = receiverUser.balance + tran.amount - fees;
    await receiverUser.save();

    currentUser.balance = currentUser.balance - tran.amount;
    await currentUser.save();
  } else {
    //kiem tra xem so du sua khi chuyen co lon hon 50000 ko?
    if (currentUser.balance - tran.amount - fees <= minimumAmount) {
      return res.status(400).json({ message: "Not enought money" });
    }
    receiverUser.balance = receiverUser.balance + tran.amount;
    await receiverUser.save();

    currentUser.balance = currentUser.balance - tran.amount - fees;
    await currentUser.save();
  }

  var messageNotify;
  if (tran.isDebt) {
    messageNotify = "Trả nợ";
  } else {
    messageNotify = "Chuyển tiền";
  }

  //Notification to user(include receiver and sender)
  // send mail, the later version with use realtime

  //send to sender
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
  <h2>You have been received ${tran.amount} from ${currentUser.username}</h2>
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

  tran.isVerified = true;
  await tran.save();
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
