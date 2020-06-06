const mongoose = require("mongoose");

const BankSchema = mongoose.Schema({
	bankId: String,
	name: String, // Ten ngan hang
	partnerCode: String, // "huuTien123" or "SonQuan123"
	method: String, // rsa or pgp
	partnerPublicKey: String,
});

const Bank = mongoose.model("Bank", BankSchema);
module.expogitrts = Bank;
