//
//Copyright (c) 2016, Skedans Systems, Inc.
//All rights reserved.
//
//Redistribution and use in source and binary forms, with or without
//modification, are permitted provided that the following conditions are met:
//
//    * Redistributions of source code must retain the above copyright notice,
//      this list of conditions and the following disclaimer.
//    * Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
//
//THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
//AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
//IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
//ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
//LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
//CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
//SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
//INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
//CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
//ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
//POSSIBILITY OF SUCH DAMAGE.
//

//var serverAddress = "https://47.72.59.9"; // Testing remote connection to easyrtc server hosted remotely
//var serverAddress = "https://192.168.1.6"; // Testing local connection to easyrtc server hosted on other network host
var serverAddress = "https://localhost:8443"; //  Testing local connectiong to easyrtc server hosted locally with default port 8443
var selfEasyrtcid = "";
var selfNickname = "";
var visitorCount = 0;
var connectList = {};
var channelIsActive = {}; // tracks which channels are active


function connect() {
    easyrtc.setSocketUrl(serverAddress); //Add this line to point to your easyrtc server if not using easyrtc directly to serve up web files.
    easyrtc.enableDebug(false);
    easyrtc.enableDataChannels(true);
    easyrtc.enableVideo(false);
    easyrtc.enableAudio(false);
    easyrtc.enableVideoReceive(false);
    easyrtc.enableAudioReceive(false);
    easyrtc.setDataChannelOpenListener(openListener);
    easyrtc.setDataChannelCloseListener(closeListener);
    easyrtc.setPeerListener(addToConversation);
    easyrtc.setRoomOccupantListener(convertListToButtons);
    easyrtc.connect("easyrtc.dataMessaging", loginSuccess, loginFailure);
}


function addToConversation(senderid, username, content) {
    // Escape html special characters, then add linefeeds.
    content = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    content = content.replace(/\n/g, '<br />');
    var objDiv = document.getElementById("conversation");
    objDiv.innerHTML += "<b>" + username + "(" + senderid + "):</b>&nbsp;" + content + "<br />";
    objDiv.scrollTop = objDiv.scrollHeight;        
}


function openListener(otherParty) {
    channelIsActive[otherParty] = true;
    visitorCount += 1;
    document.getElementById('connectionCount').innerHTML = "Connections: " + visitorCount;
    updateButtonState(otherParty);
}


function closeListener(otherParty) {
    channelIsActive[otherParty] = false;
    visitorCount -= 1;
    document.getElementById('connectionCount').innerHTML = "Connections: " + visitorCount;
    updateButtonState(otherParty);
}

function convertListToButtons(roomName, occupantList, isPrimary) {
    connectList = occupantList;

    var otherClientDiv = document.getElementById('otherClients');
    while (otherClientDiv.hasChildNodes()) {
        otherClientDiv.removeChild(otherClientDiv.lastChild);
    }
    
    var label, button, rowGroup;
    rowGroup = document.createElement("div");
    label = document.createTextNode("Send To All ");
    rowGroup.appendChild(label);
    rowGroup.appendChild(addSendToAll());
    otherClientDiv.appendChild(rowGroup);

    for (var easyrtcid in connectList) {
        rowGroup = document.createElement("br");
        otherClientDiv.appendChild(rowGroup);
        rowGroup = document.createElement("div");
        label = document.createTextNode(easyrtc.idToName(easyrtcid) + " ");
        rowGroup.appendChild(label);

        button = document.createElement('button');
        button.id = "connect_" + easyrtcid;
        button.onclick = function(easyrtcid) {
            return function() {
                startCall(easyrtcid);
            };
        }(easyrtcid);
        label = document.createTextNode("Connect");
        button.appendChild(label);
        rowGroup.appendChild(button);

        button = document.createElement('button');
        button.id = "send_" + easyrtcid;
        button.onclick = function(easyrtcid) {
            return function() {
                sendStuffP2P(easyrtcid);
            };
        }(easyrtcid);
        label = document.createTextNode("Send Message");
        button.appendChild(label);
        rowGroup.appendChild(button);
        otherClientDiv.appendChild(rowGroup);
        updateButtonState(easyrtcid);
        if (easyrtc.getConnectStatus(easyrtcid) === easyrtc.NOT_CONNECTED) 
        {
            startCall(easyrtcid);
        }
    }
    if (!otherClientDiv.hasChildNodes()) {
        otherClientDiv.innerHTML = "<em>No Guests are connected to talk to...</em>";
    }
}

function addSendToAll(){
    var label, button;
    button = document.createElement('button');
    button.id = "send-to-all";
    button.onclick = function() {
        return function() {
            sendToAll(selfEasyrtcid,selfNickname);
        };
    }();
    label = document.createTextNode("Send To All");
    button.appendChild(label);
    return button;
}

function updateButtonState(otherEasyrtcid) {
    var isConnected = channelIsActive[otherEasyrtcid];
    if(document.getElementById('connect_' + otherEasyrtcid)) {
        document.getElementById('connect_' + otherEasyrtcid).disabled = isConnected;
    }
    if( document.getElementById('send_' + otherEasyrtcid)) {
        document.getElementById('send_' + otherEasyrtcid).disabled = !isConnected;
    }
}


function startCall(otherEasyrtcid) {
    if (easyrtc.getConnectStatus(otherEasyrtcid) === easyrtc.NOT_CONNECTED) {
        try {
        easyrtc.call(otherEasyrtcid,
                function(caller, media) { // success callback
                    if (media === 'datachannel') {
                        // console.log("made call succesfully");
                        connectList[otherEasyrtcid] = true;
                    }
                },
                function(errorCode, errorText) {
                    connectList[otherEasyrtcid] = false;
                    easyrtc.showError(errorCode, errorText);
                },
                function(wasAccepted) {
                    // console.log("was accepted=" + wasAccepted);
                }
        );
        }catch( callerror) {
            console.log("saw call error ", callerror);
        }
    }
    else {
        easyrtc.showError("ALREADY-CONNECTED", "already connected to " + easyrtc.idToName(otherEasyrtcid));
    }
}

function sendStuffP2P(otherEasyrtcid) {
    var text = document.getElementById('sendMessageText').value;
    if (text.replace(/\s/g, "").length === 0) { // Don't send just whitespace
        return;
    }
    if (selfNickname.replace(/\s/g, "").length === 0) { // Don't send just whitespace for name
        easyrtc.showError("No Nickname", "Please enter a Nickname to send chat!");
        return;
    }
    if (easyrtc.getConnectStatus(otherEasyrtcid) === easyrtc.IS_CONNECTED) {
        easyrtc.sendDataP2P(otherEasyrtcid, selfNickname, text);
        addToConversation(otherEasyrtcid, selfNickname, text);
    }
    else {
        easyrtc.showError("NOT-CONNECTED", "not connected to the admin yet.");
    }

    document.getElementById('sendMessageText').value = "";
}

function sendToAll(senderid,username) {
    var text = document.getElementById('sendMessageText').value;
    if (text.replace(/\s/g, "").length === 0) { // Don't send just whitespace
        return;
    }
    if (username.replace(/\s/g, "").length === 0) { // Don't send just whitespace for name
        easyrtc.showError("No Nickname", "Please enter a Nickname to send chat!");
        return;
    }

    if (visitorCount != 0)
    {
        for (var easyrtcid in connectList) {
            if (easyrtc.getConnectStatus(easyrtcid) === easyrtc.IS_CONNECTED) {
                easyrtc.sendDataP2P(easyrtcid, username, text);
            }
        }
        addToConversation("Sent To All", username, text);
        document.getElementById('sendMessageText').value = "";
    }
    
}


function loginSuccess(easyrtcid) {
    selfEasyrtcid = easyrtcid;
    selfNickname = "Admin";
    document.getElementById("iam").innerHTML = "Your Connected To Live Chat Support as Admin!";
}


function loginFailure(errorCode, message) {
    document.getElementById("iam").innerHTML = "Connection Failed! Error Code: " + errorCode;
}
