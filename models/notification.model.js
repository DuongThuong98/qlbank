const mongoose = require("mongoose");

const NotificationSchema = mongoose.Schema(
	{
		notificationTitle: String,
		notificationContent: String,
		fromUserId: String, // ứng với AccountNumber
		fromBankId: Number,
		toUserId: String, // ứng với AccountNumber
		toBankId: Number,
		isSent: Boolean, // notification is send or not
		ts: Number,
	},
	{ timestamps: true }
);

const Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;
