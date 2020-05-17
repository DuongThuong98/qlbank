const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require("mongoose");
require('express-async-errors');

const config = require('./config/default.json');
const verify = require('./middlewares/auth.mdw');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

//connecting to the database
mongoose.Promise = global.Promise;
mongoose
    .connect(config.monggodb.url, {
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

app.get('/', (req, res) => {
  res.json({
    msg: 'hello from nodejs express api'
  });
})

// app.use('/api/auth', require('./routes/auth.route'));
app.use('/api/users', require('./routes/user.route'));
// app.use('/api/categories', verify, require('./routes/category.route'));
// app.use('/api/products', verify, require('./routes/product.route'));

app.use((req, res, next) => {
  res.status(404).send('NOT FOUND');
})

app.use(function (err, req, res, next) {
  console.log(err.stack);
  // console.log(err.status);
  const statusCode = err.status || 500;
  res.status(statusCode).send('View error log on console.');
})

const PORT = 3000;
app.listen(PORT, _ => {
  console.log(`API is running at http://localhost:${PORT}`);
})

// const NodeRSA = require('node-rsa');
// const key = new NodeRSA({b: 512});
 
// const text = 'Hello RSA!';
// const encrypted = key.encrypt(text, 'base64');
// console.log('encrypted: ', encrypted);
// const decrypted = key.decrypt(encrypted, 'utf8');
// console.log('decrypted: ', decrypted);

