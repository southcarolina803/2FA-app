/*
 
 The MIT License (MIT)

 Copyright (c) 2015 Douglas J. Bakkum, Shift Devices AG

 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the "Software"),
 to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense,
 and/or sell copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included
 in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
 OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.

*/

'use strict';

var VERSION = '1.0.1'; // match to version in config.xml

var Crypto = require("crypto");
var Bitcore = require("bitcore-lib");
var Ripemd160 = require('ripemd160');
var Base58Check = require('bs58check');
var Reverse = require("buffer-reverse");


var PORT = 25698;
var WARNFEE = 500000; // satoshis TODO update
var SAT2BTC = 100000000; // conversion
var COINNET = 'livenet';
//var COINNET = 'testnet';
var VERIFYPASS_CRYPT_TEST = 'Digital Bitbox 2FA';

var DBB_COLOR_SAFE = "#0C0",
    DBB_COLOR_WARN = "#880",
    DBB_COLOR_DANGER = "#C00",
    DBB_COLOR_BLACK = "#000";
    
var OP_CHECKMULTISIG = 'ae',
    OP_1 = '51';

var ui = {
    header: null,
    pairBlinkDialog: null,
    waitingDialog: null,
    spinnerDialog: null,
    serverUrlDialog: null,
    serverUrlText: null,
    serverUrlChangeButton: null,
    serverUrlSubmitButton: null,
    serverUrlCancelButton: null,
    serverErrorSettingsButton: null,
    serverErrorCancelButton: null,
    serverErrorDialog: null,
    qrSequenceDialog: null,
    qrSequenceText: null,
    randomNumberDialog: null,
    randomNumber: null,
    randomNumberButton: null,
    receiveDialog: null,
    receiveAddress: null,
    receiveButton: null,
    sendDialog: null,
    sendAmount: null,
    sendAddress: null,
    sendDetails: null,
    sendError: null,
    sendCancelButton: null,
    sendDetailsButton: null,
    sendUnlockedMode: null,
    sendLockedMode: null,
    lockSendAcceptButton: null,
    lockSendCancelButton: null,
    lockSendDetailsButton: null,
    blinkDelButton: null,
    blink1Button: null,
    blink2Button: null,
    blink3Button: null,
    blink4Button: null,
    connectCheckDialog: null,
    connectCheck: null,
    connectPcDialog: null,
    connectScanButton: null,
    disconnectButton: null,
    pairDbbDialog: null,
    pairFailDialog: null,
    pairSuccessDialog: null,
    //pairManualButton: null,
    pairBeginButton: null,
    pairRetryButton: null,
    pairSuccessButton: null,
    pairStrength: null,
    pairProgress: null,
    pairExistsDialog: null,
    pairExistsPairButton: null,
    pairExistsContinueButton: null,
    parseErrorDialog: null,
    parseErrorPairButton: null,
    parseErrorCancelButton: null,
    txErrorDialog: null,
    txErrorPairButton: null,
    txErrorCancelButton: null,
    optionsIcon: null,
    scanButton: null, 
    splashScreen: null,
    optionsSlider: null,
};

var dialog = {};

var ecdh = Crypto.createECDH('secp256k1');

var connectCheckingText = '<i class="fa fa-minus fa-spin fa-2x"></i><br><br><br>Checking connection...'; 

var pair = {
    blinkcode: [],
    serverFile: null,
    QRtext: [],
    inputAddresses: [],
};

var localData = {
    server_id: "",
    server_key: "",
    server_url: "https://bitcoin.jonasschnelli.ch/dbb/server.php", /* default */
    verification_key: "",
};

var localDataFile = null;
var tx_details = "";
var tx_lock_pin = "";
var server_poll_pause = false;


// ----------------------------------------------------------------------------
// Startup
// 

document.addEventListener("deviceready", init, false);

function init()
{
    /*
    // Automatically create user interface object from DOM id's in camelCase format
    var ids = document.querySelectorAll('[id]');
    Array.prototype.forEach.call( ids, function( element, i ) {
        var id = element.id;
        id = id.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
        ui[id] = element;     
        if (id.includes('Dialog'))
            dialog[id.replace('Dialog', '')] = element;
    });
    */

    // Create user interface object
    for (var u in ui) {
      var id = u.replace(/([A-Z])/g, '-$1').toLowerCase();
      var element = document.getElementById(id);
      if (!element) {
        throw "Missing UI element: " + u;
      }
      ui[u] = element;
        
      if (u.includes('Dialog'))
          dialog[u.replace('Dialog', '')] = element;
    }
    
    ui.header.addEventListener("touchstart", hideOptionButtons, false);
    ui.optionsIcon.addEventListener("touchstart", toggleOptions, false);
    ui.serverUrlChangeButton.addEventListener("touchstart", serverUrl, false);
    ui.serverUrlSubmitButton.addEventListener("touchstart", serverUrlSubmit, false);
    ui.serverUrlCancelButton.addEventListener("touchstart", serverUrlCancel, false);
    ui.serverErrorSettingsButton.addEventListener("touchstart", serverUrl, false);
    ui.serverErrorCancelButton.addEventListener("touchstart", serverUrlCancel, false);
    ui.randomNumberButton.addEventListener("touchstart", randomNumberClear, false);
    ui.receiveButton.addEventListener("touchstart", waiting, false);
    ui.sendCancelButton.addEventListener("touchstart", waiting, false);
    ui.sendDetailsButton.addEventListener("touchstart", sendDetails, false);
    ui.lockSendAcceptButton.addEventListener("touchstart", sendLockPin, false);
    ui.lockSendCancelButton.addEventListener("touchstart", sendLockCancel, false);
    ui.lockSendDetailsButton.addEventListener("touchstart", sendDetails, false);
    //ui.pairManualButton.addEventListener("touchstart", pairManual, false);
    ui.pairBeginButton.addEventListener("touchstart", pairBegin, false);
    ui.pairRetryButton.addEventListener("touchstart", function(){ displayDialog(dialog.pairDbb) }, false);
    ui.pairSuccessButton.addEventListener("touchstart", waiting, false);
    ui.pairExistsPairButton.addEventListener("touchstart", function(){ displayDialog(dialog.pairDbb) }, false);
    ui.pairExistsContinueButton.addEventListener("touchstart", waiting, false);
    ui.parseErrorPairButton.addEventListener("touchstart", function(){ displayDialog(dialog.pairDbb) }, false);
    ui.parseErrorCancelButton.addEventListener("touchstart", waiting, false);
    ui.txErrorPairButton.addEventListener("touchstart", function(){ displayDialog(dialog.pairDbb) }, false);
    ui.txErrorCancelButton.addEventListener("touchstart", waiting, false);
    ui.disconnectButton.addEventListener("touchstart", disconnect, false);
    ui.connectScanButton.addEventListener("touchstart", connectScan, false);
    ui.scanButton.addEventListener("touchstart", startScan, false);
    ui.blinkDelButton.addEventListener("touchstart", blinkDel, false);
    ui.blink1Button.addEventListener("touchstart", blinkPress1, false);
    ui.blink2Button.addEventListener("touchstart", blinkPress2, false);
    ui.blink3Button.addEventListener("touchstart", blinkPress3, false);
    ui.blink4Button.addEventListener("touchstart", blinkPress4, false);

    if (navigator && navigator.splashscreen)
        navigator.splashscreen.hide();
    fade(ui.splashScreen); 
    
    loadLocalData();
    
    ui.connectCheck.innerHTML = connectCheckingText;
    setTimeout(startUp, 2000);
}

function fade(element) {
    var op = 1;  // opaque
    var timer = setInterval(function () {
        if (op <= 0.01){
            clearInterval(timer);
            element.style.display = 'none';
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ')';
        op -= 0.05;
    }, 20);
}

function startUp() {
    
    ui.serverUrlText.value = localData.server_url;
    
    if (localData.server_id === "" || localData.server_id === undefined) {
        console.log('State - no server id.');
        displayDialog(dialog.connectPc);
    }
    
    else if (localData.verification_key === "" || localData.verification_key === undefined) {
        console.log('State - not paired.');
        displayDialog(dialog.pairDbb);
    }

    else
        waiting();

    serverSend('{"version":"' + VERSION + '"}');
    serverPoll();
}

// ----------------------------------------------------------------------------
// Network status (debugging)
//

function checkConnection() {
    var networkState = navigator.connection.type;

    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.CELL]     = 'Cell generic connection';
    states[Connection.NONE]     = 'No network connection';

    console.log('Connection type: ' + states[networkState]);
}


// ----------------------------------------------------------------------------
// Server communication
//
   
function serverPoll() {
       
    if (server_poll_pause) {
        setTimeout(serverPoll, 2000);
        return;
    }
    
    if (navigator.connection.type === Connection.NONE) {
        displayDialog(dialog.connectCheck);
        ui.connectCheck.innerHTML = 'No internet connection.';
        setTimeout(serverPoll, 500);
        return;
    } else
        ui.connectCheck.innerHTML = connectCheckingText;

    if (localData.server_id === "" || localData.server_id === undefined) {
        console.log('Poll - no server id.');
        displayDialog(dialog.connectPc);
        setTimeout(serverPoll, 2000);
        return;
    }
    
    var req = new XMLHttpRequest();
    req.open("GET", localData.server_url + '?c=gd&uuid=' + localData.server_id + '&dt=1', true);
    req.onreadystatechange = function() {
        if (req.readyState == 4) {
            if (req.status == 200) {
                var ret = JSON.parse(req.responseText);
                //console.log('Recv:', ret.data, localData.server_id);
                if (ret.data) {
                    var payload = ret.data[0].payload;
                    //payload = new Buffer(payload, 'base64').toString('utf8');
                    //payload = new Buffer(payload, 'base64').toString('utf8');
                    payload = aes_cbc_b64_decrypt(payload, localData.server_key);
                    console.log('Data', ret.data[0].id, ":", payload);
                    parseData(payload);
                }
                serverPoll();
            } else {
                console.log('Could not connect to server', localData.server_url);
                displayDialog(dialog.serverError);
                setTimeout(serverPoll, 2000);
            }
        }
    }
    req.send();
}

function serverSendEncrypt(msg) {
    msg = aes_cbc_b64_encrypt(msg, localData.server_key);
    serverSend(msg);
}

function serverSend(msg) {
    console.log('Sending to server:', msg);
    var rn = Math.floor((Math.random() * 100000) + 1);
    var postContent = '&c=data&uuid=' + localData.server_id + '&pl=' + msg + '&dt=1';
    var req = new XMLHttpRequest();
    req.open("POST", localData.server_url + '?rn=' + rn, true);
    req.setRequestHeader('Content-type','application/text; charset=utf-8');
    req.send(postContent);
}


// ----------------------------------------------------------------------------
// General UI
//

function displayDialog(D) {
    
    //console.log("dialog", D);
    
    for (var d in dialog)
        dialog[d].style.display = "none";
    if (D)
        D.style.display = "block"; 
}

function showOptionButtons() {
    ui.optionsSlider.style.top = "0%";
}

function hideOptionButtons() {
    ui.optionsSlider.style.top = "-100%";
}

function toggleOptions() {
    if (ui.optionsSlider.style.top == "-100%")
        showOptionButtons();
    else
        hideOptionButtons();
}

function randomNumberClear()
{
    serverSendEncrypt('{"random":"clear"}');
    waiting();
}

function disconnect() {
    serverSendEncrypt('{"action":"disconnect"}');
    hideOptionButtons();
    setTimeout(function() { 
        displayDialog(dialog.connectPc);
        localData.server_id = "";
        localData.server_key = "";
        localData.verification_key = "";
        writeLocalData();
    }, 500);
}
            
function waiting() {
    server_poll_pause = false;
    displayDialog(dialog.waiting);
}

function serverUrl() {
    server_poll_pause = true;
    hideOptionButtons();
    displayDialog(dialog.serverUrl);
}

function serverUrlSubmit() {
    server_poll_pause = false;
    localData.server_url = ui.serverUrlText.value;
    writeLocalData();
    
    if (localData.server_id === '')
        displayDialog(dialog.connectPc);
    else if (localData.verification_key === '')
        displayDialog(dialog.pairDbb);
    else
        displayDialog(dialog.pairExists);

    console.log('Setting server URL:', localData.server_url);
}

function serverUrlCancel() {
    server_poll_pause = false;
    
    if (localData.server_id === '')
        displayDialog(dialog.connectPc);
    else if (localData.verification_key === '')
        displayDialog(dialog.pairDbb);
    else
        waiting();
}

// ----------------------------------------------------------------------------
// ECDH pairing UI
//

function blinkCodeStrength() {
    if (pair.blinkcode.length == 0) {
        ui.pairStrength.innerHTML = "&nbsp;";
    } else if (pair.blinkcode.length < 3) {
        ui.pairStrength.innerHTML = "Low strength";
        ui.pairStrength.style.color = DBB_COLOR_DANGER;
    } else if (pair.blinkcode.length < 5) {
        ui.pairStrength.innerHTML = "Medium strength";
        ui.pairStrength.style.color = DBB_COLOR_WARN;
    } else if (pair.blinkcode.length > 5) {
        ui.pairStrength.innerHTML = "&nbsp;";
        ui.pairStrength.style.color = DBB_COLOR_BLACK;
    } else {
        ui.pairStrength.innerHTML = "&nbsp;";
    }
        
    if (pair.blinkcode.length == 0)
        ui.pairProgress.innerHTML = "&nbsp;";
    else
        ui.pairProgress.innerHTML = '<b>' + Array(pair.blinkcode.length + 1).join(" * ") + '</b>';
}


function blinkPress1() { blinkPress(1); }
function blinkPress2() { blinkPress(2); }
function blinkPress3() { blinkPress(3); }
function blinkPress4() { blinkPress(4); }
function blinkPress(p) {
    pair.blinkcode.push(p);
    blinkCodeStrength();
}

function blinkDel() {
    if (pair.blinkcode.length == 0)
        displayDialog(dialog.pairDbb);
    else
        pair.blinkcode.pop();
    
    blinkCodeStrength();
}

function pairBegin() {
    pair.blinkcode = [];
    blinkCodeStrength();
    displayDialog(dialog.pairBlink);
    serverSendEncrypt('{"ecdh":"' + ecdhPubkey() + '"}');
}

/*
function pairManual() {
    displayDialog(null);
    
    var pubkey = ecdhPubkey();
        pubkey = Base58Check.encode(new Buffer(pubkey.toString('hex'), 'hex'));
    
    ui.pairManualText.innerHTML = 
                'Enter this in the PC app:<br><br>' +
                '<span style="color: ' + DBB_COLOR_WARN + ';">' +
                pubkey.slice(0, pubkey.length / 2) + '<br>' +
                pubkey.slice(pubkey.length / 2) + '</span>' +
                '<br><br><br>Then begin, and your Digital Bitbox will blink.<br><pre>' +
                '- Count the number of blinks in each set.\n' +
                '- Enter those numbers here.\n' +
                '- Stop anytime by tapping the Digital Bitbox\'s touch button.</pre>';
    
    serverSendEncrypt('{"ecdh":"manual"}');
}
*/


// ----------------------------------------------------------------------------
// Local storage
// 

function loadLocalData() {
	try {
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function(dir) {
            dir.getFile("localdata.txt", {create:true}, function(file) {
			    localDataFile = file;
		        readLocalData(); 
            })
	    })
    }
    catch(err) {
        console.log(err.message);
    }
}

function readLocalData() {
    try {
        localDataFile.file(function(file) {
            var reader = new FileReader();
            reader.onloadend = function(e) {
                if (e.target.result) {
                    localData = JSON.parse(e.target.result);
                } else {
                    console.log('no file data to read');
                }
            }
            reader.readAsText(file);
        })
    }
    catch(err) {
        console.log(err.message);
    }
}

function writeLocalData() {
	try {
        if (!localDataFile) return;
        localDataFile.createWriter(function(fileWriter) {
            var blob = new Blob([JSON.stringify(localData)], {type:"text/plain"});
            fileWriter.write(blob);
        })
    }
    catch(err) {
        console.log(err.message);
    }
}



// ----------------------------------------------------------------------------
// Transaction UI
// 

function sendDetails()
{
    ui.sendDetails.innerHTML = "<pre>" + tx_details + "</pre>";
    
    if (ui.sendDetails.style.display === "none")
        ui.sendDetails.style.display = "block";
    else
        ui.sendDetails.style.display = "none";
}

function sendLockPin()
{
    serverSendEncrypt('{"pin":"' + tx_lock_pin + '"}');
    waiting();
}

function sendLockCancel()
{
    serverSendEncrypt('{"pin":"abort"}');
    waiting();
}

// ----------------------------------------------------------------------------
// Scan UI
// 

function connectScan()
{
    displayDialog(dialog.connectCheck);
    startScan();
}

function startScan()
{
    hideOptionButtons();
    try {
    cordova.plugins.barcodeScanner.scan(
		function (result) {
            parseData(result.text);
        }, 
		function (error) {
			console.log("Scanning failed: " + error);
		}
	)
    }
    catch(err) {
        console.log(err.message);
    }
}


// ----------------------------------------------------------------------------
// Crypto
// 

function aes_cbc_b64_decrypt(ciphertext, key)
{
    var res;
    try {
        var ub64 = new Buffer(ciphertext, "base64").toString("binary");
        var iv   = new Buffer(ub64.slice(0, 16), "binary");
        var enc  = new Buffer(ub64.slice(16), "binary");
        var k    = new Buffer(key, "hex");
        var decipher = Crypto.createDecipheriv("aes-256-cbc", k, iv);
        var dec = decipher.update(enc) + decipher.final();
        res = dec.toString("utf8");
    }
    catch(err) {
        console.log(err);
        res = ciphertext;
    }
    
    return res;
}

function aes_cbc_b64_encrypt(plaintext, key)
{
    try {
        var iv = Crypto.pseudoRandomBytes(16);
        var k  = new Buffer(key, "hex");
        var cipher = Crypto.createCipheriv("aes-256-cbc", k, iv);
        var ciphertext = Buffer.concat([iv, cipher.update(plaintext), cipher.final()]);
        return ciphertext.toString("base64");
    }
    catch(err) {
        console.log(err);
    }
}

function ecdhPubkey() {
    ecdh.generateKeys();
    return ecdh.getPublicKey('hex','compressed'); // 33 bytes
}    

function p2pkHash(script) {
    var hash = Crypto.createHash('sha256')
               .update(new Buffer(script, 'hex'))
               .digest();
    hash = Ripemd160(hash);
    if (COINNET === 'livenet') {
        hash = Base58Check.encode(new Buffer('00' + hash.toString('hex'), 'hex'));
    } else if (COINNET === 'testnet') {
        hash = Base58Check.encode(new Buffer('6f' + hash.toString('hex'), 'hex'));
    } else {
        hash = 0;
    }
    return hash;
}

function multisigHash(script) {
    var hash = Crypto.createHash('sha256')
               .update(new Buffer(script, 'hex'))
               .digest();
    hash = Ripemd160(hash);
    if (COINNET === 'livenet') {
        hash = Base58Check.encode(new Buffer('05' + hash.toString('hex'), 'hex'));
    } else if (COINNET === 'testnet') {
        hash = Base58Check.encode(new Buffer('c4' + hash.toString('hex'), 'hex'));
    } else {
        hash = 0;
    }
    return hash;
}

function multisig1of1(publickey) {
    var pushbytes = (publickey.length  / 2).toString(16);
    var script = OP_1 + pushbytes + publickey + OP_1 + OP_CHECKMULTISIG;
    return multisigHash(script);
}

function getInputs(transaction, sign) {
    var blockWorker = new Worker("js/getData.js");
    var addresses = [];
    var tx = [];
    pair.inputAddresses = [];
   
    function onlyUnique(value, index, self) { 
        return self.indexOf(value) === index;
    }

    for (var i = 0; i < transaction.inputs.length; i++) {
        var tr = transaction.toJSON().inputs[i]; 
        var a = new Bitcore.Script(tr.script)
                           .toAddress(COINNET)
                           .toString();
        addresses.push(a);
       
        var t = {};
        t.address = a;
        t.id = tr.prevTxId;
        tx.push(t);
    }
    
    var unique_addresses = addresses.filter( onlyUnique );
    var addrs = unique_addresses[0];
    for (var i = 1; i < unique_addresses.length; i++) {
        addrs += ',' + unique_addresses[i];
    }
    
    var reply = false,
        blockexplorer_fail_limit = 2,
        blockexplorer_count = 0;
    blockWorker.postMessage("https://blockexplorer.com/api/addrs/" + addrs + "/utxo");
    blockWorker.postMessage("https://insight.bitpay.com/api/addrs/" + addrs + "/utxo");
    blockWorker.postMessage("https://btc.blockr.io/api/v1/address/unspent/" + addrs);
    blockWorker.onmessage = function(e) {
        if (e.data === null) {
            blockexplorer_count++;
            if (blockexplorer_count >= blockexplorer_fail_limit) {
                console.log('Error: could not get address balances.');
                blockWorker.terminate();
                process_verify_transaction(transaction, sign);
            }
            return;
        }
        
        if (reply)
            return;
        reply = true;
        
        var ret = JSON.parse(e.data[0]);

        // Reformat JSON from blockr.io 
        if (typeof ret.data === 'object') {
            var tmp = ret.data;
            ret = [];
            
            if (tmp.length === undefined || tmp.length == 1) {
                for (var j = 0; j < tmp.unspent.length; j++) {
                    var t = {};
                    t.address = tmp.address;
                    t.txid = tmp.unspent[j].tx;
                    t.amount = tmp.unspent[j].amount;
                    ret.push(t);
                }
            } else { 
                for (var i = 0; i < tmp.length; i++) {
                    for (var j = 0; j < tmp[i].unspent.length; j++) {
                        var t = {};
                        t.address = tmp[i].address;
                        t.txid = tmp[i].unspent[j].tx;
                        t.amount = tmp[i].unspent[j].amount;
                        ret.push(t);
                    }
                }
            }
        }

        for (var i = 0; i < ret.length; i++) {
            for (var j = 0; j < tx.length; j++) {
                if (ret[i].txid === tx[j].id && ret[i].address === tx[j].address) {
                    var input = {};
                    input.balance = Number(ret[i].amount) * SAT2BTC;
                    input.address = ret[i].address;
                    input.txid = ret[i].txid;
                    
                    var present = false;
                    for (var k = 0; k < pair.inputAddresses.length; k++) {
                        if (input.address === pair.inputAddresses[k].address) {
                            pair.inputAddresses[k].balance += Number(input.balance);
                            present = true;
                            break;
                        }
                    }
                    if (present === false) {
                        pair.inputAddresses.push(input);
                    }

                    break;
                }
            }
        }
           
        blockWorker.terminate();
        console.log('Got address balances.', pair.inputAddresses.length);
        process_verify_transaction(transaction, sign);
    };
}


// ----------------------------------------------------------------------------
// Parse input / verification
// 

function process_verify_transaction(transaction, sign) 
{    
    var total_in = 0, 
        total_out = 0,
        external_address = '',
        external_amount = 0,
        err = '',
        res = '';

    tx_details = '';

    // Get outputs and amounts
    tx_details += "\nOutputs:\n";
    for (var i = 0; i < transaction.outputs.length; i++) {
        var address, amount, present;
        address = transaction.outputs[i].script
            .toAddress(COINNET).toString();

        amount = transaction.outputs[i].satoshis;
        total_out += amount / SAT2BTC;

        // Check if the output address is a change address
        present = false;
        for (var j = 0; j < sign.checkpub.length; j++) {
            var checkaddress;
            var pubk = sign.checkpub[j].pubkey; 
            if (1) { // p2pkh
                checkaddress = p2pkHash(pubk);
            } else { // multisig
                checkaddress = multisigHash(pubk);
            }
            if (checkaddress === address) {
                present = sign.checkpub[j].present; 
            }
        }

        if (!present || transaction.outputs.length == 1) {
            res = address + "  " + amount / SAT2BTC + " BTC\n";
            tx_details += '<span style="color: ' + DBB_COLOR_WARN + ';">' + res + '</span>';
            external_address = address;
            external_amount += amount / SAT2BTC;
        } else {
            res = address + "  " + amount / SAT2BTC + " BTC (change address)\n";
            tx_details += '<span style="color: ' + DBB_COLOR_SAFE + ';">' + res + '</span>';
        }
    }

    if (typeof sign.pin == "string") {
        ui.sendUnlockedMode.style.display = "none";
        ui.sendLockedMode.style.display = "block";
        tx_lock_pin = sign.pin;
    } else {
        ui.sendUnlockedMode.style.display = "block";
        ui.sendLockedMode.style.display = "none";
        tx_lock_pin = '';
    }
    
    
    // Display short result
    ui.sendDetails.style.display = "none";
    ui.sendAddress.innerHTML = external_address;
    ui.sendAmount.innerHTML = external_amount;
    displayDialog(dialog.send);

    
    // Get input addresses and balances
    tx_details += "\nInputs:\n";
    for (var i = 0; i < pair.inputAddresses.length; i++) {
        var address = pair.inputAddresses[i].address;
        var balance = pair.inputAddresses[i].balance;
        res = address + "  " + balance / SAT2BTC + " BTC\n";
        tx_details += '<span style="color: ' + DBB_COLOR_SAFE + ';">' + res + '</span>';
        total_in += balance / SAT2BTC;
    }
    
    
    // Calculate fee (inputs - outputs)
    res = "Fee:\n" + (total_in - total_out).toFixed(8) + " BTC\n";
    if ((total_in - total_out) < 0) {
        tx_details = 'Fee:<span style="color: ' + DBB_COLOR_DANGER + ';">' +
                     '\nDid not receive all input amounts from the blockchain explorers. ' +
                     'The fee is equal to the total input amounts minus the total output amounts.\n' +
                     'Check your internet settings and try again.\n</span>' + tx_details;
        
        err += '<br>WARNING: Could not calculate the fee.<br>';
                
    } else if ((total_in - total_out) * SAT2BTC > WARNFEE) {
        tx_details = '<span style="color: ' + DBB_COLOR_DANGER + ';">' + res + '</span>' + tx_details;
    } else {
        tx_details = '<span style="color: ' + DBB_COLOR_BLACK + ';">' + res + '</span>' + tx_details;
    }


    // Verify that input hashes match meta utx
    tx_details += "\nHashes to sign:\n";
    var errset = false;
    for (var j = 0; j < sign.data.length; j++) {
        var present = false;
        for (var i = 0; i < transaction.inputs.length; i++) {
            var nhashtype = Bitcore.crypto.Signature.SIGHASH_ALL;
            var script = transaction.inputs[i].script;
            //script = script.chunks[script.chunks.length - 1].buf; // redeem script is 2nd to last chunk -- hack needed for 1of1 multisig?
            
            var sighash = Bitcore.Transaction.sighash
                .sighash(transaction, nhashtype, i, script);
           
            if (sign.data[j].hash === Reverse(sighash).toString('hex'))
                present = true; 
        }

        if (present === false) {
            if (errset === false) {
                errset = true;
                err += '<br>WARNING: Unknown data being signed!<br>';
            }
            res = "Unknown: " + sign.data[j].hash;
            tx_details += '<span style="color: ' + DBB_COLOR_DANGER + ';">' + res + '<br></span>';
        } else {
            res = sign.data[j].hash;
            tx_details += '<span style="color: ' + DBB_COLOR_SAFE + ';">' + res + '<br></span>';
        }
    }
    
    
    // Extra information
    console.log("2FA message received:\n" + JSON.stringify(sign, undefined, 4));
            
    if (err != '')
        ui.sendError.innerHTML = '<span style="color: ' + DBB_COLOR_DANGER + ';">' + err + '</span>';
    else
        ui.sendError.innerHTML = '';
}


function process_dbb_pairing(parse) 
{    
    var ciphertext = parse.verifypass.ciphertext;
    var pubkey = parse.verifypass.ecdh;
    var ecdh_secret = ecdh.computeSecret(pubkey, 'hex', 'hex');
    
    localData.verification_key = Crypto.createHash('sha256').update(new Buffer(ecdh_secret, 'hex')).digest('hex');
    localData.verification_key = Crypto.createHash('sha256').update(new Buffer(localData.verification_key, 'hex')).digest('hex');
    var k = new Buffer(localData.verification_key, "hex");
    for (var i = 0; i < pair.blinkcode.length; i++) {
        k[i % 32] ^= pair.blinkcode[i]; 
    }
    localData.verification_key = k.toString('hex');
    localData.verification_key = Crypto.createHash('sha256').update(new Buffer(localData.verification_key, 'ascii')).digest('hex');
    localData.verification_key = Crypto.createHash('sha256').update(new Buffer(localData.verification_key, 'hex')).digest('hex');

    writeLocalData();
    
    if (aes_cbc_b64_decrypt(ciphertext, localData.verification_key) === VERIFYPASS_CRYPT_TEST) {
        console.log("Successfully paired.");
        displayDialog(dialog.pairSuccess);
    } else {
        console.log("Pairing failed!");
        displayDialog(dialog.pairFail);
    }
}
  

function process_verify_address(plaintext, type) 
{    
    var parse = Base58Check.decode(plaintext).slice(-33).toString('hex');

    if (type === 'p2pkh')
        parse = p2pkHash(parse);
    else 
        parse = multisig1of1(parse);
    
    if (parse) 
        parse = "<pre>" + parse + "</pre>";
    else
        parse = 'Error: Coin network not defined.';

    ui.receiveAddress.innerHTML = parse;
    displayDialog(dialog.receive);
}


function parseData(data)
{
    try {
            
        if (data == '') {
            server_poll_pause = false;
            pair.QRtext = [];
            return;
        }
        
        // QR sequence reader
        if (data.slice(0,2).localeCompare('QS') == 0) {
            var text = '';
            var inprogress = false;
            var seqNumber = data[2]; // {0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ}
            var seqTotal = data[3];
          
            server_poll_pause = true;

            if (isNaN(seqNumber)) {
                seqNumber = seqNumber.toUpperCase().charCodeAt(0);
                seqNumber = seqNumber - "A".charCodeAt(0) + 10;
            }
            
            if (isNaN(seqTotal)) {
                seqTotal = seqTotal.toUpperCase().charCodeAt(0);
                seqTotal = seqTotal - "A".charCodeAt(0) + 10;
            }
            
            pair.QRtext[seqNumber] = data.substring(4);

            for (var i = 0; i < seqTotal; i++) {
                if (pair.QRtext[i] === undefined) {
                    inprogress = true;
                    text += ' _ ';
                } else 
                    text += '&#9724;';
            }
           
            if (inprogress) {
                ui.qrSequenceText.innerHTML = 'continue scanning<br>' + text;
                displayDialog(dialog.qrSequence);
                setTimeout(startScan, 1500); // ms
                return;
            }
            
            data = pair.QRtext.join('');
            pair.QRtext = [];
        }
            
        
        data = JSON.parse(data);
        

        // Tests if already paired to Digital Bitbox
        if (typeof data.tfa == "string") {
            console.log('tfa value', data.tfa);
            if (aes_cbc_b64_decrypt(data.tfa, localData.verification_key) === VERIFYPASS_CRYPT_TEST) {
                console.log("Successfully paired.");
                displayDialog(dialog.pairSuccess);
            } else {
                console.log("Pairing failed!");
                displayDialog(dialog.pairFail);
            }
            return;
        }
            
        // Server requested action
        if (typeof data.action == "string") {
            console.log('server request:', data.action);
            
            if (data.action == "clear") {
                if (localData.verification_key === '')
                    displayDialog(dialog.pairDbb);
                else
                    waiting();
                return;
            }
            
            if (data.action == "ping") {
                serverSendEncrypt('{"action":"pong"}');
                return;
            }
        }

        // Sets up connection to desktop app
        if (typeof data.id == "string") {
            console.log('Setting ID:', data.id, ' - Key:', data.key);
            data.key = new Buffer(data.key, 'base64').toString('hex')
            
            // do hmac_sha256    
            /*
                var hash = Crypto.createHmac('sha256', data.key)
                   .update(data.key)
                   .digest('hex');
            console.log('dbg', hash); 
            */

            localData.server_id = data.id;
            localData.server_key = data.key;
            writeLocalData();
            
            if (localData.verification_key === '')
                displayDialog(dialog.pairDbb);
            else
                displayDialog(dialog.pairExists);

            console.log('Setting ID:', data.id, ' - Key:', data.key);
            serverSendEncrypt('{"id":"success"}');
            return;
        } 
        

        // Finalizes ECDH pairing to Digital Bitbox
        if (typeof data.verifypass == "object") {
            process_dbb_pairing(data);
            return;
        } 


        if (typeof data.echo == "string") {
            // Echo verification of data
            var ciphertext = data.echo;
            var plaintext = aes_cbc_b64_decrypt(ciphertext, localData.verification_key);

            if (plaintext === ciphertext) {
                console.log('Could not parse: ' + JSON.stringify(plaintext, undefined, 4));
                displayDialog(dialog.parseError);
                return; 
            }
           
            // Verify receiving address
            if (plaintext.slice(0,4).localeCompare('xpub') == 0) {
                process_verify_address(plaintext, data.type);
                return;
            }
            
            // Verify random number
            if (typeof JSON.parse(plaintext).random == "string") {
                ui.randomNumber.innerHTML = JSON.parse(plaintext).random;
                displayDialog(dialog.randomNumber);
                return;
            }

            // Verify transaction
            if (typeof JSON.parse(plaintext).sign == "object") {
        
                displayDialog(dialog.connectCheck);
                ui.connectCheck.innerHTML = 'Processing...';
                
                var transaction;
                var sign = JSON.parse(plaintext).sign;
                
                if (typeof data.tx == "string") {
                    var hash;
                    hash = Crypto.createHash('sha256')
                                 .update(new Buffer(data.tx, 'ascii'))
                                 .digest();
                    hash = Crypto.createHash('sha256')
                                 .update(new Buffer(hash, 'hex'))
                                 .digest()
                                 .toString('hex');
                    
                    if (hash !== sign.meta) {
                        console.log('Error: mismatched verification data.');
                        displayDialog(dialog.txError);
                        return;
                    }
                     
                    transaction = new Bitcore.Transaction(data.tx);
                } else {
                    transaction = new Bitcore.Transaction(sign.meta);
                }

                if (typeof JSON.parse(plaintext).pin == "string")
                    sign.pin = JSON.parse(plaintext).pin;
                    
                getInputs(transaction, sign); // calls process_verify_transaction() after getting input values
                return;
            }
                
            console.log('No operation for: ' + JSON.stringify(data, undefined, 4));
            displayDialog(dialog.parseError);
            return;
        }

        console.log('Unknown input: ' + JSON.stringify(data, undefined, 4));
        displayDialog(dialog.parseError);
    
    }
    catch(err) {
        console.log(err, data);
        displayDialog(dialog.parseError);
    }
}

