const mongoose = require("mongoose");

const TransactionSchema = mongoose.Schema(
	{
		sentUserId: String,
		sentBankId: String,
		receivedUserId: String,
		receivedBankId: String,
		isDebt: Boolean, // Có phải trả nợ không?
		isReceiverPaid: Boolean, // Người nhận trả phí giao dịch? => True: người nhận trả, false: người gửi trả.
		amount: Number,
		content: String,
		signature: String,
	},
	{
		timestamps: true,
	}
);

const Transaction = mongoose.model("Transaction", TransactionSchema);
module.exports = Transaction;
