// ==UserScript==
// @name        dA_Skin_Emulator
// @namespace   dA_Skin_Emulator
// @description Gallery-skin management and emulation for non-premium-users
// @match     http://*.deviantart.com/gallery/*
// @version     0.1
// @grant       GM_setValue
// @grant       GM_getValue
// ==/UserScript==

function da_skin_emulator(){

var premiummode=false;

function start(){
	var transaction = db.transaction(["dASkinEmulator"], "readwrite"); //new transaction for getting data
	var objectStore = transaction.objectStore("dASkinEmulator"); 
	transaction.onerror = function(event) { //in case of an error, something went wrong...
		console.log(event)
	}; 
	objectStore.get("test").onsuccess=function(event){ //load authorlist
		if(typeof event.target.result!="undefined")console.log(event.target.result.value);
	};;
	setTimeout(function(){GM_setValue("test","gesetzt von "+location.href)},1000);
	changeskin();
}

function changeskin(){
// if(premiummode){
// "8102786","347833501","config",{"set":"46324713"
	DiFi.pushPost("GrusersModules","save",	
	// ["3396247","6012625","config",
	// {"current_setid":"24669846",
	["8102786","347833501","config",
	{"current_setid":"46324713",
	"display_set_description":"hui!",
	"display_set_css":"div{background-color:red;}"}],function(success,data){
		// location.reload();
	});

	DiFi.send();
	// }
}


//indexedDB to store Data... grant is just for chrome to allow unsafeWindow
var db;
var request = indexedDB.open("dASkinEmulator",1);
request.onerror = function(event) {
  console.log(event);
};
request.onupgradeneeded = function(event) { 
  db = event.target.result;
  var objectStore = db.createObjectStore("dASkinEmulator",{keyPath:"name"});
  objectStore.createIndex("name", "name", { unique: true });
}
request.onsuccess = function(event) {
    db = request.result;
	var transaction = db.transaction(["dASkinEmulator"], "readwrite");
	var objectStore = transaction.objectStore("dASkinEmulator");
	transaction.onerror = function(event) {
		console.log(event)
	};  
	GM_setValue=function(Gname, Gvalue){
		transaction = db.transaction(["dASkinEmulator"], "readwrite");
		var objectStore = transaction.objectStore("dASkinEmulator");
		transaction.onerror = function(event) {
			console.log(event)
		};  
		objectStore.put({name:Gname,value:Gvalue}).onerror=function(event){console.log(event);};
	};
	start();
};
}

var scry=document.createElement("script");
scry.innerHTML="("+da_skin_emulator.toString()+")();";
document.body.appendChild(scry);
document.body.removeChild(scry);