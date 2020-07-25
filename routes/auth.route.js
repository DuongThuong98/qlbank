const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const usersModel = require("../models/users.model");
const { randomString } = require("../helpers/helpers");
const bcrypt = require("bcryptjs");
const { totp } = require("otplib");
const nodemailer = require("nodemailer");
const moment = require("moment");

// const config = require('../config/default.json');

const router = express.Router();

// --- Login ---
router.post("/login", (req, res) => {
	passport.authenticate("local", { session: false }, (error, user, info) => {
		if (error || !user) return res.status(401).send(info);
		req.login(user, { session: false }, async (error) => {
			if (error) throw new Error();
			const { username, role } = user;
			console.log(user);

			const tempRefreshToken = randomString(40);
			await usersModel.findOneAndUpdate(
				{ username: username },
				{
					refreshToken: tempRefreshToken,
					rdt: moment().format(),
				}
			);
			const accessToken = generateAccessToken(username, role);
			return res.json({
				accessToken: accessToken,
				refreshToken: tempRefreshToken,
			});
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

//refresh token
router.post("/refresh", async (req, res) => {
	// req.body = {
	//   accessToken,
	//   refreshToken
	// }

	if (req.body.refreshToken === null || req.body.accessToken === null) {
		return res.status(400).json("Invalid access-token or refresh-token");
	}
	await jwt.verify(
		req.body.accessToken,
		"secretKey",
		{ ignoreExpiration: true },
		async function (err, payload) {
			if (err) res.status(400).json(err);
			const { username, role } = payload;
			// console.log(req.body);

			console.log(payload);
			const ret = await usersModel.findOne({
				$and: [{ username: username }, { refreshToken: req.body.refreshToken }],
			});
			if (ret) {
				const accessToken = generateAccessToken(username, role);
				res.status(200).json({ accessToken: accessToken });
			} else {
				//throw new Error("Mã token sai");
				res.status(400).json({ message: "Refresh không thành công" });
			}
		}
	);
});

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
					user: "khactrieuhcmus@gmail.com",
					pass: "khactrieuserver",
				},
				tls: {
					rejectUnauthorized: false,
				},
			});

			var content = "";
			content += `<div>
					<h2>Hi, ${user.name.toUpperCase()}!</h2>
					<p>You recently requested to reset your password for your SAPHASAN Bank account. Here is your OTP code to reset:</p>
					<h1> ${code}</h1>
					<p>If you did not request a password reset, please ignore this email! This password reset is only valid for the next 5 minutes.</p>
					<p>Thanks,</p>
					<p>SAPHASAN Bank Team.</p>
				</div>`;

			var mailOptions = {
				from: `huuthoigialai@gmail.com`,
				to: email,
				subject: "SAPHASAN Bank Password Reset",
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

router.post("/verify-forgot-password", (req, res) => {
	const { code, newPassword, email } = req.body;

	usersModel.findOne({ email: email }).exec(async (err, user) => {
		if (err) return res.status(500).send({ message: err });
		if (!user) return res.status(404).send({ message: "User Not found." });
		const isValid = totp.check(code, email);
		console.log("isValid: ", isValid, email);
		if (isValid) {
			newPasswordHash = bcrypt.hashSync(newPassword, 10);
			const result = await usersModel.findOneAndUpdate(
				{ email },
				{ passwordHash: newPasswordHash }
			);
			if (result) {
				return res.json({ success: true, message: "Reset password success" });
			} else {
				return res.status(400).json({ message: "Authentication error!" });
			}
		} else {
			return res.status(400).json({ message: "Code is invalid or expired!" });
		}
	});
});

//end region forgot password

module.exports = router;
