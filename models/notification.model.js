const mongoose = require("mongoose");

const NotificationSchema = mongoose.Schema(
	{
		notificationTitle: String,
		notificationContent: String,
		fromUserId: String, // ứng với AccountNumber, nếu bằng 0 là noti từ admin
		fromBankId: Number,
		toUserId: String, // ứng với AccountNumber, nếu bằng Null là gửi đến tất cả user trong nội bộ
		toBankId: Number,
		isSent: Boolean, // notification is send or not
	},
	{ timestamps: true }
);

const Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;