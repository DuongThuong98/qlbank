const express = require("express");
const router = express.Router();
const { totp } = require("otplib");
const nodemailer = require("nodemailer");

const TransactionModel = require("../models/transaction.model");
const keyOTP = "#@vevyveryOTPsecretkey@#";

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
//	isverified: Boolean
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

  const currentUser = req.user;

  //add new transaction
  const model = new {
    sentUserId: currentUser.id,
    sentBankId: currentUser.bankId,
    receivedUserId: receivedUserId,
    receivedUserId: receivedUserId,
    isDebt: isDebt,
    isVerified: false,
    isReceiverPaid: isReceiverPaid,
    amount: amount,
    content: content,
    signature: signature,
  }();

  TransactionModel.create(model, function (err, tran) {
    if (err) {
      return res.status(500).json({ message: err });
    } else {
      //create succesfully => create otp code
      totp.options = { step: 300, digits: 8 };
      var key = keyOTP + currentUser.id;
      const code = totp.generate(key);

      //send mail
      var transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: "mail to send ",
          pass: "pass",
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      var content = "";
      content += `<div>
        <h2>Use the code below to verify iformation </h2>
				<h1> ${code}</h1>
				<p>This code will be expired after 5 minutes!</p>
				</div>  
		`;

      var mailOptions = {
        from: `huuthoigialai@gmail.com`,
        to: email,
        subject: "Gửi Mã OTP",
        html: content,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          return res.status(400).json({ succes: false });
        } else {
          console.log("Email sent: " + info.response);
          return res.json({ succes: true });
        }
      });
    }
  });
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
