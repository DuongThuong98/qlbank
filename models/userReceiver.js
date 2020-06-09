const mongoose = require("mongoose");

const UserReceiverSchema = mongoose.Schema(
	{
		accountNumber: String,
		bankId: String,
		savedName: String,
	},
	{
		timestamps: true,
	}
);

const UserReceiver = mongoose.model(
	"UserReceiver",
	UserReceiverSchema
);
module.exports = UserReceiver;
