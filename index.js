//  links
/*
auth url
https://2a794ac4.ngrok.io/shopify?shop=test-store-adrian-corcoran-01.myshopify.com
*/

const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'read_products';
const forwardingAddress = "https://2a794ac4.ngrok.io"; // Replace this with your HTTPS Forwarding address

app.get('/', (req, res) => {
  res.send('Hello Adrian\'s World!');
});

app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});


//  add routes

app.get('/shopify', (req, res) => {
  const shop = req.query.shop;
  if (shop) {
    const state = nonce();
    const redirectUri = forwardingAddress + '/shopify/callback';
    const installUrl = 'https://' + shop +
      '/admin/oauth/authorize?client_id=' + apiKey +
      '&scope=' + scopes +
      '&state=' + state +
      '&redirect_uri=' + redirectUri;

    res.cookie('state', state);
    res.redirect(installUrl);
  } else {
    return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
  }
});

app.get('/shopify/callback', (req, res) => {
  const { shop, hmac, code, state } = req.query;
  const stateCookie = cookie.parse(req.headers.cookie).state;

  if (state !== stateCookie) {
    return res.status(403).send('Request origin cannot be verified');
  }

  if (shop && hmac && code) {

    //  HMAC validation
    const map = Object.assign({}, req.query);
    delete map['signature'];
    delete map['hmac'];
    const message = querystring.stringify(map);
    const generatedHash = crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('hex');

    if (generatedHash !== hmac) {
      return res.status(400).send('HMAC validation failed');
    }

    //  get access token for permanent authorisation
    const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
    const accessTokenPayload = {
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    };

    request.post(accessTokenRequestUrl, { json: accessTokenPayload })
    .then((accessTokenResponse) => {
      const accessToken = accessTokenResponse.access_token;

//    ----------------------------------------------------------------------
      // TODO
      // Use access token to make API call to 'shop' endpoint

      const shopRequestUrl = 'https://' + shop + '/admin/shop.json';
      const shopRequestHeaders = {
        'X-Shopify-Access-Token': accessToken,
      };
/*
      request.get(shopRequestUrl, { headers: shopRequestHeaders })
      .then((shopResponse) => {

        //  get the data
        var data  = JSON.parse(shopResponse);
        //  create message
        var message= 'Getting shop id... ' + data.shop.id;

        res.end(message);
      })
      .catch((error) => {
        res.status(error.statusCode).send(error.error.error_description);
      });
*/
      request.get(shopRequestUrl, { headers: shopRequestHeaders })
      .then((shopResponse) => {

        //  get the data
        var data  = JSON.parse(shopResponse);
        //  create message
        var message= 'Getting shop... ' + data.shop.name;

/*
        request.get(shopRequestUrl, { headers: shopRequestHeaders })
        .then((shopResponse1) => {

          //  get the data
          var data1  = JSON.parse(shopResponse1);
          //  create message
          message += 'Getting shop id1... ' + data1.shop.id;
        })
*/
        res.end(message);
      })
      .catch((error) => {
        res.status(error.statusCode).send(error.error.error_description);
      });

      //  jQuery
//      var $ = require("jquery");
      console.log('hi');
//    ----------------------------------------------------------------------
    })
    .catch((error) => {
      res.status(error.statusCode).send(error.error.error_description);
    });

    // TODO
    // Validate request is from Shopify
    // Exchange temporary code for a permanent access token
      // Use access token to make API call to 'shop' endpoint
  } else {
    res.status(400).send('Required parameters missing');
  }
});
