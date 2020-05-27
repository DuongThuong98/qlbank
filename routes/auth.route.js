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
			const username = user.username;
			const accessToken = generateAccessToken(username);
			return res.json(accessToken);
		});
	})(req, res);
});

const generateAccessToken = (username) =>
	jwt.sign(
		{
			username: username,
		},
		"secretKey"
		// { expiresIn: '1m' },
	);

module.exports = router;
