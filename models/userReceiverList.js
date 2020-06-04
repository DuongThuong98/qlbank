const mongoose = require("mongoose");

const UserReceiverListSchema = mongoose.Schema(
	{
		accountNumber: String,
		bankId: String,
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
