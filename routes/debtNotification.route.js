const express = require("express");
const router = express.Router();

const DebtNotificationModel = require("../models//debtNotification.model");
const UserModel = require("../models/users.model");
const Notification = require("../models/notification.model");
const notificationTitleString = "Thông tin giao dịch";

router.get("/history", async (req, res) => {
  const { accountNumber } = req.user;
  let data = [];

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

  await DebtNotificationModel.find({
    $or: [{ sentUserId: accountNumber }, { receivedUserId: accountNumber }],
  }).exec((err, debts) => {
    if (err) {
      return res.status(500).json({ message: err });
    } else {
      for (let i = 0; i < debts.length; i++) {
        // let us = users.findOne((x) => x.accountNumber === trans[i].sentUserId);
        const indexSentUser = users.findIndex((x) => {
          if (x.accountNumber === debts[i].sentUserId) return true;
          return false;
        });
        const indexReceivedUser = users.findIndex((x) => {
          if (x.accountNumber === debts[i].receivedUserId) return true;
          return false;
        });
        var obj = {
          debtId: debts[i]._id,
          sentUserId: debts[i].sentUserId,
          sentUserName:
            users[indexSentUser] != null ? users[indexSentUser].name : null,
          sentBankId: debts[i].sentBankId,
          receivedUserId: debts[i].receivedUserId,
          receivedUserName:
            users[indexReceivedUser] != null
              ? users[indexReceivedUser].name
              : null,
          receivedBankId: debts[i].receivedBankId,
          status: debts[i].status,
          amount: debts[i].amount,
          debtContent: debts[i].debtContent,
          createdAt: debts[i].createdAt,
        };

        data.push(obj);
      }
    }
    return res.json({ data: data });
  });
});

router.delete("/record", async (req, res) => {
  //_id này là id của phiếu nhắc nhợ nha
  const { debtId, feedbackContent } = req.body;
  try {
    const debt = await DebtNotificationModel.findOne({ _id: debtId });
    if (debt) {
      let updatedBySentUser = 0;
      if (debt.sentUserId === req.user.accountNumber) {
        updatedBySentUser = 1;
      }

      const result = await DebtNotificationModel.findOneAndUpdate(
        { _id: debtId },
        {
          feedbackContent: feedbackContent,
          updatedBySentUser: updatedBySentUser,
          status: "deleted",
        }
      );

      let notifyModel = {
        notificationTitle: notificationTitleString,
        notificationContent: feedbackContent,
        fromUserId: req.user.accountNumber,
        fromBankId:
          updatedBySentUser === 1 ? debt.sentBankId : debt.receivedBankId,
        toUserId:
          updatedBySentUser === 1 ? debt.receivedUserId : debt.sentUserId,
        toBankId:
          updatedBySentUser === 1 ? debt.receivedBankId : debt.sentBankId,
        isSent: false,
      };

      Notification.create(notifyModel, (err, notify) => {
        if (err) {
          return res.status(400).json({ message: err });
        } else {
          console.log(notify);
        }
      });

      // #TODO

      if (result) {
        const data = await DebtNotificationModel.findOne({ _id: result._id });
        if (data) {
          return res.status(200).json({ message: "Cập nhật thành công." });
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

// Thêm một debt record
router.post("/", (req, res) => {
  // {
  // 	"sentUserId": "String",
  // 	"sentBankId": 0,
  // 	"receivedUserId": "String",
  // 	"receivedBankId": 0,
  // 	"updatedBySentUser": Number, // default là -1, nếu người nhắc xoá thì là 1,
  // nếu người nợ xoá/trả nợ thì là 0.
  // Dùng để gửi feedbackContent cho người nhắc hoặc người nợ
  // 	"status": String, // paid, delete, pending... (1,2,3,4)
  // 	"amount": Number, // 500000
  // 	"debtContent": "String", // "Trả tiền ăn cơm hôm qua đi chứ!"
  // 	"feedbackContent": "String" // "Okay nha" / "Ủa hôm đó trả rồi mà ta?"
  // }

  const user = req.user;
  const entity = {
    sentUserId: user.accountNumber,
    sentBankId: 0,
    receivedUserId: req.body.receivedUserId,
    receivedBankId: 0,
    updatedBySentUser: -1,
    status: "pending",
    amount: req.body.amount,
    debtContent: req.body.debtContent,
  };

  console.log("Entity: ", entity);
  const newDebt = new DebtNotificationModel(entity);
  newDebt
    .save()
    .then((data) => {
      return res.json(data);
    })
    .catch((err) => {
      throw new Error(err);
    });
});

// CHƯA DÙNG ROUTE NÀY
router.patch("/", async (req, res) => {
  //_id này là id của phiếu nhắc nhợ nha
  const { _id, isDebt, content } = req.body;
  if (!_id) {
    return res.status(400).json({ message: "Id không được rỗng" });
  }

  if (!content) {
    console.log(isDebt + " fwf " + content);
    return res.status(400).json({ message: "Các trường không được trống" });
  }

  try {
    const debts = await DebtNotificationModel.findOne({ _id });
    if (debts) {
      const result = await DebtNotificationModel.findOneAndUpdate(
        { _id },
        {
          content: content || debts.content,
          isDebt: isDebt || debts.isDebt,
        }
      );
      if (result) {
        const data = await DebtNotificationModel.findOne({ _id: result._id });
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

////////

module.exports = router;
