const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const usersModel = require("../models/users.model");
const bcrypt = require("bcryptjs");

const { totp } = require("otplib");
const nodemailer = require("nodemailer");

const router = express.Router();

// --- Login ---
router.post("/login", (req, res) => {
	passport.authenticate("local", { session: false }, (error, user, info) => {
		if (error || !user) return res.status(401).send(info);
		req.login(user, { session: false }, async (error) => {
			if (error) throw new Error();
			const { username, role } = user;
			console.log(user);
			const accessToken = generateAccessToken(username, role);
			return res.json({ accessToken: accessToken });
		});
	})(req, res);
});

const generateAccessToken = (username, role) =>
	jwt.sign(
		{
			username: username,
			role: role,
		},
		"secretKey",
		{ expiresIn: "10m" }
	);

// region forgot password
router.post("/forgot-password", async (req, res) => {
	const email = req.body.email;

	usersModel
		.findOne({
			email: email,
		})
		.exec((err, user) => {
			if (err) {
				res.status(500).send({ message: err });
				return;
			}

			if (!user) {
				return res.status(404).send({ message: "User Not found." });
			}

			totp.options = { step: 300 };
			const code = totp.generate(email);
			var transporter = nodemailer.createTransport({
				host: "smtp.gmail.com",
				port: 465,
				secure: true,
				auth: {
					user: "mail to send ",
					pass: "pass",
				},
				tls: {
					rejectUnauthorized: false,
				},
			});

			var content = "";
			content += `<div>
        <h2>Use the code below to reset password!</h2>
				<h1> ${code}</h1>
				<p>This code will be expired after 5 minutes!</p>
				</div>`;

			var mailOptions = {
				from: `huuthoigialai@gmail.com`,
				to: email,
				subject: "Gửi Mã OTP",
				html: content,
			};

			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					console.log(error);
					return res.status(400).json({ success: false });
				} else {
					console.log("Email sent: " + info.response);
					return res.json({ success: true });
				}
			});
		});
});

router.post("/verify-forgot-password", async (req, res) => {
	const { code, newPassword, email } = req.body;
	usersModel.findOne({ email: email }).exec((err, user) => {
		if (err) return res.status(500).send({ message: err });
		if (!user) return res.status(404).send({ message: "User Not found." });
	});

	const isValid = totp.check(code, email);
	if (isValid) {
		newPasswordHash = bcrypt.hashSync(newPassword, 10);
		const result = await usersModel.findOneAndUpdate(
			{ email },
			{ passwordHash: newPasswordHash }
		);
		if (result) {
			res.json({ success: true, message: "Reset password success" });
		} else {
			res.status(401).json({ message: "Authentication error!" });
		}
	} else {
		res.status(401).json({ message: "Code is invalid or expired!" });
	}
});

//end region forgot password

module.exports = router;
