const mongoose = require("mongoose");

const DebtNotificationSchema = mongoose.Schema(
	{
		sentUserId: String,
		sentBankId: String,
		receivedUserId: String,
		receivedBankId: String,
		updatedBySentUser: Number, // default là -1, nếu người nhắc xoá thì là 1, nếu người nợ xoá/trả nợ thì là 0. Dùng để gửi feedbackContent cho người nhắc hoặc người nợ
		status: Number, // paid, delete, pending... (1,2,3,4)
		amount: Number, // 500000
		debtContent: String, // "Trả tiền ăn cơm hôm qua đi chứ!"
		feedbackContent: String, // "Okay nha" / "Ủa hôm đó trả rồi mà ta?"
	},
	{ timestamps: true }
);

const DebtNotification = mongoose.model(
	"DebtNotification",
	DebtNotificationSchema
);
module.exports = DebtNotification;
