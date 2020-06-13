const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");

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

module.exports = router;
