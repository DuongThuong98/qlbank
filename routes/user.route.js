const express = require('express');
const moment = require('moment');
const md5 = require('md5');
const NodeRSA = require('node-rsa');
const usersModel = require('../models/users.model');
const process = require('../config/process.config')

const router = express.Router();

router.post('/', async (req, res) => {
  const user = new usersModel(req.body);
  user.setPasswordHash(req.body.password);
  user
    .save()
    .then(userData => {
      res.status(200).send({ user: userData });
    })
    .catch(err => {
      console.log('error: ', err.message);
      return res
        .status(500)
        .send({ message: 'Đã có lỗi xảy ra, vui lòng thử lại' });
    });
})

const confirm = (req) =>{
  const ts = req.get('ts');
  const partnerCode = req.get('partnerCode');
  const hashedSign = req.get('hashedSign');

  const comparingSign = md5(ts + req.body + md5("dungnoiaihet"))
  // console.log(moment().unix());
  if (ts <= moment().unix() - 60) {
    return 1;
  }

  // console.log(partnerCode)
  if (partnerCode != "huuTien123") {
    return 2;
  }

  if(hashedSign != comparingSign){
    return 3;
  }

  if (!req.body.id) {
    return 4;
  }
  else
  {
    return 0;
  }

}

router.get('/api/customer/', async (req, res) => {

  // // console.log(moment().unix());

  var con = confirm(req);
  // console.log(con);
  if (con == 1) {
    return res.status(400).send({
      message: 'Thời gian request quá hạn'
    });
  }

  if (con == 2) {
    return res.status(400).send({
      message: 'Bạn không là đối tác'
    });
  }

  if(con == 3){
    return res.status(400).send({
      message: 'Tệp tin có thể đã bị sửa đổi'
    });
  }

  if (con == 4) {
    return res.status(400).send({
      message: 'Không nhận được ID'
    });
  }

  await usersModel.findOne({ _id: req.body.id }, (err, data) => {
    if (err) {
      return res
        .status(500)
        .send({ message: 'Đã có lỗi xảy ra, vui lòng thử lại!' });
    }
    if (data) {
      return res
        .status(200)
        .send({ user: data });
    }
    else{
      return res
      .status(403)
      .send({ message: "Không có dữ liệu" });
    }

  });
})

router.get('/api/transaction/', async (req, res) => {

  const sign = req.get('sign');
  const keyPublic = new NodeRSA(process.huuTien.RSA_PUBLICKEY);
  var veri = keyPublic.verify(req,sign,"base64","base64")

  var con = confirm(req);
  // console.log(con);
  if (con == 1) {
    return res.status(400).send({
      message: 'Thời gian request quá hạn'
    });
  }

  if (con == 2) {
    return res.status(400).send({
      message: 'Bạn không là đối tác'
    });
  }

  if(con == 3){
    return res.status(400).send({
      message: 'Tệp tin có thể đã bị sửa đổi'
    });
  }

  if (con == 4) {
    return res.status(400).send({
      message: 'Không nhận được ID'
    });
  }

  if(veri != true){
    return res.status(400).send({
      message: 'Sai chữ kí'
    });
  }

  await usersModel.findOne({ _id: req.body.id }, (err, data) => {
    if (err) {
      return res
        .status(500)
        .send({ message: 'Đã có lỗi xảy ra, vui lòng thử lại!' });
    }
    if (data) {
      return res
        .status(400)
        .send({ user: data });
    }
    else{
      return res
      .status(403)
      .send({ message: "Không có dữ liệu" });
    }


  });
})



module.exports = router;