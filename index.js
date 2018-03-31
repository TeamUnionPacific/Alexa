'use strict';

var request = require("request");
var http = require('http');
const Speechlet = require("alexa-speechlet");

const soap = require('soap');
// const util = require('util');
// let id = request.intent.slots.Train.Value;

exports.handler = function(event,context) {

  try {

    if(process.env.NODE_DEBUG_EN) {
      console.log("Request:\n"+JSON.stringify(event,null,2));
    }

    var request = event.request;
    var session = event.session;

    //let id = request.intent.slots.Train.value;

    if(!event.session.attributes) {
      event.session.attributes = {};
    }

    if (request.type === "LaunchRequest") {
      handleLaunchRequest(context, session);

    }
    else if (request.type === "IntentRequest") {

      if (request.intent.name === "TrainLine") {
        //if(id != null)
        handleTrainLineIntent(request,context,session);
      }

      else if(request.intent.name === "Position"){
        handlePositionIntent(request,context,session);
      }

      else if(request.intent.name === "Name"){
        context.succeed(buildResponse({
          speechText: "What would you like me to call you?",
          endSession: false
        }));
        if(request.intent.name === "Change"){
          handleNameChange(request,context,session);
        }
      }
      else if(request.intent.name === "Change"){
        handleNameChange(request,context,session);
      }

      else if(request.intent.name === "ChangeTimeFormat"){
        handleChangeTimeFormat(request,context,session);
      }

      else if (request.intent.name === "AMAZON.StopIntent" || request.intent.name === "AMAZON.CancelIntent") {
        context.succeed(buildResponse({
          speechText: "Good bye. ",
          endSession: true
        }));

      }

      else {
        throw "Unknown intent";
      }

    }

    else if (request.type === "SessionEndedRequest") {

    }

    else {
      throw "Unknown intent type";
    }
  } catch(e) {
    context.fail("Exception: "+e);
  }

}


/*******************
* Added
******************/
function url(){
  return "http://174.138.38.48:8080/TUPCapstoneApplication/VoiceAssistantOps?wsdl"
}

// function getQuote(callback) {
function getLineUp(id, time_format, amazonId, callback){
/*******************
* Added
******************/

    var args = {
      trainLineupId : id,
      timeFormat : time_format
    };
    var log_args = {
      assistantId: amazonId,
      query: "",
      intent: "getTrainLineup",
      assistant: "Amazon",
      error: ""
    };
    soap.createClient(url(), function(err, client){
      client.getTrainLineup(args, function(err, result){
        if(result != null){

          var obj = JSON.parse(result['return']);
          var rows = obj['rows'];

          if(rows.length > 0){
            var rows = obj['rows'];
            var trains = [];

            for(var i=0; i<rows.length; i++){
              trains.push('<say-as interpret-as="spell-out">'+rows[i][2]+'</say-as>' + " at " + rows[i][1] + "...");
            }
            trains = trains.join(" ");
            callback(trains);
          }
          else{
            callback("ERROR");
          }

        }
        else{
          callback("ERROR");
        }
      })
      client.generateLog(log_args, function(err, result){})
    })

}


function getPosition(amazonId, callback){
  var args = {
    assistantId: amazonId
  };
  var log_args = {
    assistantId: amazonId,
    query: "",
    intent: "getEmpPosition",
    assistant: "Amazon",
    error: ""
  };
  soap.createClient(url(), function(err, client){
    client.getEmpPosition(args, function(err, result){
      if(result != null){
        var num = JSON.parse(result['return']);
        callback(num['position']);
      }

      else{
        callback("ERROR");
      }
    })
    client.generateLog(log_args, function(err, result){})
  })
}

function logPreferenceChange(amazonId, preference, callback){
  var log_args = {
    assistantId: amazonId,
    query: "",
    intent: preference,
    assistant: "Amazon",
    error: ""
  };
  soap.createClient(url(), function(err, client){
    client.generateLog(log_args, function(err, result){
      callback(true);
    })
  })
}

function getPreferences(amazonId, callback){
  var args = { AmazonAlexaId : amazonId };
  soap.createClient(url(), function(err, client){
    client.getPreferences(args, function(err, result){
      var result = JSON.parse(result['return']);
      /*
      * result = {PreferredName: "name", TimeFormat: "[AMPM | MIL]"}
      */
      callback(result);
    })
  })
}

function updatePreferredName(amazonId, username, callback){
  var args = {
    AmazonAlexaId: amazonId,
    PreferredName: username
  };
  var log_args = {
    assistantId: amazonId,
    query: "",
    intent: "changeUsername",
    assistant: "Amazon",
    error: ""
  };
  soap.createClient(url(), function(err, client){
    client.updatePreferredName(args, function(data, err){
      callback(true);
    })
    client.generateLog(log_args, function(err, result){})
  })
}

function updateTimeFormat(amazonId, time_format, callback){
  var args = {
    AmazonAlexaId: amazonId,
    TimeFormat: time_format
  };
  var log_args = {
    assistantId: amazonId,
    query: "",
    intent: "changeTimeFormat",
    assistant: "Amazon",
    error: ""
  };
  soap.createClient(url(), function(err, client){
    client.updateTimeFormat(args, function(data, err){
      callback(true);
    })
    client.generateLog(log_args, function(err, result){})
  })
}




function getWish() {
  var myDate = new Date();
  var hours = myDate.getUTCHours() - 8;
  if (hours < 0) {
    hours = hours + 24;
  }

  if (hours < 12) {
    return "Good Morning. ";
  } else if (hours < 18) {
    return "Good afternoon. ";
  } else {
    return "Good evening. ";
  }

}


function buildResponse(options) {

  if(process.env.NODE_DEBUG_EN) {
    console.log("buildResponse options:\n"+JSON.stringify(options,null,2));
  }

  var response = {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "SSML",
        ssml: "<speak>"+options.speechText+"</speak>"
      },
      shouldEndSession: options.endSession
    }
  };

  if(options.repromptText) {
    response.response.reprompt = {
      outputSpeech: {
        type: "SSML",
        ssml: "<speak>"+options.repromptText+"</speak>"
      }
    };
  }

  if(options.cardTitle) {
    response.response.card = {
      type: "Simple",
      title: options.cardTitle
    }

    if(options.imageUrl) {
      response.response.card.type = "Standard";
      response.response.card.text = options.cardContent;
      response.response.card.image = {
        smallImageUrl: options.imageUrl,
        largeImageUrl: options.imageUrl
      };

    } else {
      response.response.card.content = options.cardContent;
    }
  }

  if(options.session && options.session.attributes) {
    response.sessionAttributes = options.session.attributes;
  }

  if(process.env.NODE_DEBUG_EN) {
    console.log("Response:\n"+JSON.stringify(response,null,2));
  }

  return response;
}

function handleLaunchRequest(context, session) {
  let options = {};
  var username_ = "";
  var timeFormat_ = "";
  let amazonId = session.user.userId;
  var speechText = "welcome to PST schedule app beta. You can request info about a train lineup or request your position. What can I help you with? ";

  options.repromptText = "You can say for example, what is my postion. or what is train line up four digits code ";
  options.endSession = false;

  // app launched, check for new session: if new then retrieve username and time format from database and add to session
  if(session.new == true){
    // retrieve username and time format and add to sessionAttributes
    getPreferences(amazonId, function(data, err){
      username_ = data['PreferredName'];
      timeFormat_ = data['TimeFormat'];

      // add the values to options, so they will be recorded in the session by being inserted into sessionAttributes
      options.session = {
        attributes: {
          username: username_,
          timeFormat: timeFormat_
        }
      };

      options.speechText = "Hello " + username_ + ", " + speechText;
      context.succeed(buildResponse(options));
    });

  }
  else{
    username_ = session.attributes.username;
    options.speechText = "Hello " + username_ + ", " + speechText;
    context.succeed(buildResponse(options));
  }
}


function handleTrainLineIntent(request,context,session){
  let options = {};
  let id = request.intent.slots.Train.value;
  let amazonId = session.user.userId;
  let username = session.attributes.username;
  let timeFormat = session.attributes.timeFormat;
  options.session = session;

    getLineUp(id, timeFormat, amazonId, function(data,err) {
    if(err) {
      context.fail(err);
    }
    else if(data == "ERROR"){
      options.speechText = " You train id is not correct...";
      options.speechText += " Please try again ";
      options.endSession = false;
      context.succeed(buildResponse(options));
    }
    else {
      options.speechText = username + ' , here is information for train line up <say-as interpret-as="spell-out">' + id + '</say-as>.  ' + data +"..";
      options.speechText += " If you would like to continue please enter another command. ";
      // options.repromptText = "You can say yes or more. ";
      // options.session.attributes.quoteIntent = true;
      options.endSession = false;
      context.succeed(buildResponse(options));
    }
  });
}


function handlePositionIntent(request,context,session){
  let options = {};
  let amazonId = session.user.userId;
  let username = session.attributes.username;
  options.session = session;

    getPosition(amazonId, function(data,err) {
    if(err) {
      context.fail(err);
    } else {
      let speech = new Speechlet();
      // options.speechText = "You are at   " + speech.sayAs(data, {interpretAs: "ordinal"}).pause("1s").output();
      options.speechText = username + ", you are " + data + " times out..";
      options.speechText += "     Do you want to check anything else? ";
      options.endSession = false;
      context.succeed(buildResponse(options));
    }
  });
}


function handleNameChange(request,context,session){
  let options = {};
  let name = request.intent.slots.changeName.value;
  let amazonId = session.user.userId;
  session.attributes.username = name; // change username in the session
  options.session = session;

  // change the username in the database
  updatePreferredName(amazonId, name, function(data, err){
    let speech = new Speechlet();
    options.speechText = "Your preferred name is now " + name + "..";
    options.speechText += "     Do you want to check anything else? ";
    options.endSession = false;
    context.succeed(buildResponse(options));
  });
}

function handleChangeTimeFormat(request,context,session){
  let options = {};
  let amazonId = session.user.userId;
  let time_format = request.intent.slots.timeFormat.value;
  if(time_format == "12 hour"){
    time_format = "AMPM";  // temporary hack: alexa cant accept input of "AMPM" so using key phrase "12 Hour"
  }
  else if(time_format == "military"){
    time_format = "Military";
  }
  session.attributes.timeFormat = time_format; // change in the session
  options.session = session;

  // change in the database
  updateTimeFormat(amazonId, time_format, function(data, err){
    let speech = new Speechlet();
    options.speechText = "Your preferred time format is now " + time_format + "..";
    options.speechText += "     Do you want to check anything else? ";
    options.endSession = false;
    context.succeed(buildResponse(options));
  })
}
// function handleNextQuoteIntent(request,context,session) {
//   let options = {};
//   options.session = session;

//   if(session.attributes.quoteIntent) {
//     getLineUp(function(data,err) {
//       if(err) {
//         context.fail(err);
//       } else {
//         options.speechText = data;
//         options.speechText += " Do you want to listen to one more quote? ";
//         options.repromptText = "You can say yes or one more. ";
//         //options.session.attributes.quoteIntent = true;
//         options.endSession = false;
//         context.succeed(buildResponse(options));
//       }
//     });
//   } else {
//     options.speechText = " Wrong invocation of this intent. ";
//     options.endSession = true;
//     context.succeed(buildResponse(options));
//   }

// }
