const mongoose = require("mongoose");

const UserReceiverListSchema = mongoose.Schema(
	{
		sentUserId: String,
		sentBankId: String,
		receivedUserId: String,
		receivedBankId: String,
		savedName: String,
	},
	{
		timestamps: true,
	}
);

const UserReceiverList = mongoose.model(
	"UserReceiverList",
	UserReceiverListSchema
);
module.exports = UserReceiverList;
