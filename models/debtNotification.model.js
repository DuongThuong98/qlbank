const mongoose = require("mongoose");

const DebtNotificationSchema = mongoose.Schema(
  {
    sentUserId: {
      type: String,
      required: true,
    },
    sentBankId: {
      type: Number,
      default: 0,
    },
    receivedUserId: {
      type: String,
      required: true,
    },
    receivedBankId: {
      type: Number,
      default: 0,
    },
    updatedBySentUser: {
      type: Number,
      default: -1,
    }, // default là -1, nếu người nhắc xoá thì là 1,
    // nếu người nợ xoá/trả nợ thì là 0.
    // Dùng để gửi feedbackContent cho người nhắc hoặc người nợ
    status: {
      type: String,
      default: "pending",
    }, // paid, deleted, pending (1,-1,0)
    amount: Number, // 500000
    debtContent: {
      type: String,
      default: "",
    }, // "Trả tiền ăn cơm hôm qua đi chứ!"
    feedbackContent: {
      type: String,
      default: "",
    }, // "Okay nha" / "Ủa hôm đó trả rồi mà ta?"
    transactionId: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

const DebtNotification = mongoose.model(
  "DebtNotification",
  DebtNotificationSchema
);

module.exports = DebtNotification;

// {
// 	type: mongoose.Schema.Types.ObjectId,
// 	ref: "Users",
// },
