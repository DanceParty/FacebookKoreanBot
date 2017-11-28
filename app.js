var express = require('express')
var bodyParser = require('body-parser')
var request = require('request')
var hangulRomanization = require('hangul-romanization');
var NaverTranslator = require('naver-translator');

var app = express()

// helpers
var helpers = require('./src/helpers.js')


var naverConfig = require('./config/naver-config.js')
var facebookConfig = require('./config/facebook-config.js')
var apiKey = require('./config/google-config.js')

var googleTranslate = require('google-translate')(apiKey.apiKey);


var credentials = {
	client_id : naverConfig.config.naverClient,
	client_secret : naverConfig.config.naverSecret
};

var PAGE_ACCESS_TOKEN = facebookConfig.config.pageAccessToken


var translator = new NaverTranslator(credentials)


app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Description:
// 		Return true 20% of the time
// Where:
//		Returning an advertisement 20% of the time

function sendTextMessage(recipientId, messageText) {

	// this matches all hangul characters so I know if
	// the incoming message is in English or hangul
  var hangulRegex = /[\u3131-\uD79D]/ugi;
  var params = messageText.match(hangulRegex) ? { text : messageText, source : 'ko', target : 'en' } : { text : messageText, source : 'en', target : 'ko' }
  var messageData = {
    recipient: {
      id: recipientId,
    },
    message: {
      text: null
    }
  }
	// if hangul then translate to english
  translator.translate(params, function(res, err) {
    if (err) {
      googleTranslate.translate(params.text, params.target, function(err, translation) {
        if (err) {
          console.log('** google error:', err)
          var errMessage = helpers.handleError(err)
          messageData.message.text = errMessage
          callSendAPI(messageData);
        }
        var romanization = hangulRomanization.convert(result);
        messageData.message.text = translation.translatedText + '\n\n' + romanization
        callSendAPI(messageData);
        console.log(translation.translatedText);
      });
    } else {
      if (params.source === 'ko') {
        messageData.message.text = res
      } else {
        var romanization = hangulRomanization.convert(result);

        /* Translation Message */
        messageData.message.text = res + '\n\n' + romanization
      }
      callSendAPI(messageData);
    }
  })
}

function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: 'This is a bot created by Keevan Dance (http://keevan.dance). Help keep this bot running by donating ' +
      'here: https://www.paypal.me/keevandance. If this bot helped you translate what you needed, ' +
      'please give us a positive rating!'
    }
  };
  callSendAPI(messageData);
}

function sendAttachmentMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: 'Hey, translating images/videos/speech/emojis is tough or impossible. I hope I can have ' +
      'that available one day!'
    }
  };
  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

    } else {
      console.error("Unable to send message: ", error);
      //console.error(response);
      //console.error(error);
    }
  });
}

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {
    // If we receive a text message, check to see if it matches a keyword
    // and send back the example. Otherwise, just echo the text we received.
    switch (messageText) {
      case 'info':
        sendGenericMessage(senderID);
        break;

      default:
        sendTextMessage(senderID, messageText);
    }
  } else if (messageAttachments) {
    sendAttachmentMessage(senderID);
  }
}

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === PAGE_ACCESS_TOKEN) {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else {
					// every message is returning this in addition to running through
					// receivedMessage(), not sure why??
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});
