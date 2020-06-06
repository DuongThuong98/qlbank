const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const passport = require("passport");
const config = require("./config/default.json");

require("./middlewares/passport");
require("express-async-errors");

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

//swagger
const pathToSwaggerUi = require("swagger-ui-dist").absolutePath();
app.use(express.static(pathToSwaggerUi));

var swaggerUi = require("swagger-ui-express"),
	swaggerDocument = require("./swagger.json");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//connecting to the database
mongoose.Promise = global.Promise;
mongoose
	.connect(process.env.mongoURL || config.mongodb.localUrl, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useFindAndModify: false,
	})
	.then(() => {
		console.log("Successfully connected to the database");
	})
	.catch((err) => {
		console.log("Could not connected to the database. Exiting now...", err);
		process.exit();
	});

app.get("/", (req, res) => {
	res.json({
		msg: "hello from nodejs express api",
	});
});

app.use("/api/auth", require("./routes/auth.route"));
app.use("/api/external", require("./routes/external.route"));
app.use(
	"/api/users",
	passport.authenticate("jwt", { session: false }),
	require("./routes/user.route")
);
app.use(
	"/api/banks",
	passport.authenticate("jwt", { session: false }),
	require("./routes/bank.route")
);

app.use((req, res, next) => {
	res.status(404).send("NOT FOUND");
});



app.use(function (err, req, res, next) {
	console.log(err.stack);
	// console.log(err.status);
	const statusCode = err.status || 500;
	res.status(statusCode).send("View error log on console.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`API running on port ${PORT}`);
});
