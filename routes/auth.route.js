const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const { totp } = require("otplib");
const nodemailer = require("nodemailer");
const { request } = require("express");
const KeyGenCode = "key-gen-otp-code";
const VerifyCodeModel = require("../models/verifyCode");
const router = express.Router();
const minutesExpired = 5;
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
      const code = totp.generate(KeyGenCode);

      //create
      let codeOTP = Math.floor(Math.random() * 1000000) + 100000; //ex: "111111"
      const verifyCode = VerifyCodeModel.create({
        email: email,
        code: codeOTP,
        expiredDate: new Date(),
        type: 0,
      });

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
				<h1> ${codeOTP}</h1>
				<p>This code will be expired after 5 minutes!</p>
				</div>  
		`;

      var mailOptions = {
        from: `huuthoigialai@gmail.com`,
        to: email,
        subject: "Gửi Mã OTP",
        html: content,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          return res.status(400).json({ succes: false });
        } else {
          console.log("Email sent: " + info.response);
          return res.json({ succes: true });
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

  //   const isValid = totp.check(code, KeyGenCode);
  //   if (isValid) {
  //     newPasswordHash = bcrypt.hashSync(newPassword, 10);
  //     const result = await usersModel.findOneAndUpdate(
  //       { email },
  //       { passwordHash: newPasswordHash }
  //     );
  //     if (result) {
  //       res.json({ succes: true, message: "Reset password success" });
  //     } else {
  //       res.status(401).json({ message: "Authentication error!" });
  //     }
  //   } else {
  //     res.status(401).json({ message: "Code is invalid or expried!" });
  //   }

  var verify = VerifyCodeModel.find({ email: email, code: code });

  var minutes = (new Date().getTime() - verify.expiredDate.getTime()) / 60000;
  if (verify == null || verify.type != 0 || minutes > minutesExpired) {
    res.status(401).json({ message: "Code is invalid or expired!" });
  } else {
    newPasswordHash = bcrypt.hashSync(newPassword, 10);
    const result = await usersModel.findOneAndUpdate(
      { email },
      { passwordHash: newPasswordHash }
    );
    if (result) {
      res.json({ succes: true, message: "Reset password success" });
    } else {
      res.status(401).json({ message: "Authentication error!" });
    }
  }
});

//end region forgot password

module.exports = router;
