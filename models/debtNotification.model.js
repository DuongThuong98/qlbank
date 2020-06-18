const mongoose = require("mongoose");

const DebtNotificationSchema = mongoose.Schema(
	{
		sentUserId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Users",
		},
		sentBankId: String,
		receivedUserId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Users",
		},
		receivedBankId: String,
		updatedBySentUser: {
			type: Number,
			default: 0
		}, // default là 0, nếu người nhắc xoá thì là 1, nếu người nợ xoá thì là 2, trả nợ là 3.
		// Dùng để gửi feedbackContent cho người nhắc hoặc người nợ
		status: {
			type: Number,
			default: 0
		}, // paid, delete, pending... (1,-1,0)
		amount: Number, // 500000
		debtContent: {
			type: String,
			default: ""
		}, // "Trả tiền ăn cơm hôm qua đi chứ!"
		feedbackContent: {
			type: String,
			default: ""
		} // "Okay nha" / "Ủa hôm đó trả rồi mà ta?"
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