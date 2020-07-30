const mongoose = require("mongoose");

const TransactionSchema = mongoose.Schema(
	{
		sentUserId: {
			type: String,
			required: true,
		},
		sentUserName: {
			type: String,
		},
		sentBankId: {
			type: Number,
			required: true,
		},
		receivedUserId: {
			type: String,
			required: true,
		},
		receivedUserName: {
			type: String,
		},
		receivedBankId: {
			type: Number,
			required: true,
		},
		isDebt: {
			type: Boolean,
			default: false,
		},
		isReceiverPaid: {
			type: Boolean, // Người nhận trả phí giao dịch? => True: người nhận trả, false: người gửi trả.
			default: false,
		},
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
		transactionIdCode: String,
		code: String,
	},
	{
		timestamps: true,
	}
);

const Transaction = mongoose.model("Transaction", TransactionSchema);
module.exports = Transaction;
