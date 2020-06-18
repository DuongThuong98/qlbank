const mongoose = require("mongoose");

const TransactionSchema = mongoose.Schema(
  {
    sentUserId: {
      type: String,
      required: true,
    },
    sentBankId: {
      type: String,
      required: true,
    },
    receivedUserId: {
      type: String,
      required: true,
    },
    receivedBankId: {
      type: String,
      required: true,
    },
    isDebt: Boolean, // Có phải trả nợ không?
    isReceiverPaid: Boolean, // Người nhận trả phí giao dịch? => True: người nhận trả, false: người gửi trả.
    amount: {
      type: Number,
      required: true,
    },
    content: String,
    signature: String,
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model("Transaction", TransactionSchema);
module.exports = Transaction;
