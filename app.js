var express = require('express')
var bodyParser = require('body-parser')
var request = require('request')
var hangulRomanization = require('hangul-romanization');
var NaverTranslator = require('naver-translator');

var app = express()

var naverConfig = require('./config/naver-config.js')
var facebookConfig = require('./config/facebook-config.js')


var credentials = {
	client_id : naverConfig.naverClient,
	client_secret : naverConfig.naverSecret
};

var PAGE_ACCESS_TOKEN = facebookConfig.pageAccessToken


var translator = new NaverTranslator(credentials)

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

function sendTextMessage(recipientId, messageText) {
  var hangulRegex = /[\u3131-\uD79D]/ugi;
  var params = {}
  if (messageText.match(hangulRegex)) {
    params = {
  	  text : messageText,
      source : 'ko',
      target : 'en'
    };
		translator.translate(params, function(result) {
	    var messageData = {
	      recipient: {
	        id: recipientId
	      },
	      message: {
	        text: result,
	      }
	    }
	    callSendAPI(messageData);
	  });
  } else {
    params = {
  	  text : messageText,
      source : 'en',
      target : 'ko'
    };
		translator.translate(params, function(result) {
	    var romanization = hangulRomanization.convert(result);
	    var messageData = {
	      recipient: {
	        id: recipientId
	      },
	      message: {
	        text: result + '\n\n' + romanization,
	      }
	    }
	    callSendAPI(messageData);
	  });
  }


}

function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: 'This is a bot created by Keevan Dance (http://keevan.dance) ' +
      'Software Developer for CORE Construction. Help keep this bot running by donating ' +
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
      text: 'Hey, translating images/videos/speech is tough, hope I can have ' +
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
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
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
          console.log("Webhook received unknown event: ", event);
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
