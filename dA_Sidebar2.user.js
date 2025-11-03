// ==UserScript==
// @name         dA_Sidebar2
// @namespace    phi.pf-control.de/userscripts/dA_Sidebar2
// @version      2.0
// @description  Track /watch count on all sites. See /watch counts in /watch menu and button
// @author       Dediggefedde
// @match        *://*/*
// @grant        GM.xmlHttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.addStyle
// @grant        GM.notification
// @noframes
// @sandbox      DOM
// ==/UserScript==


(function() {
	'use strict';
	let settings={
			checkInterval:60, //interval to check/make requests [seconds]
			quickCheck:1, //number of notification pages to check. 0= all
			countNew:true, //Counts only unread notifications
			checkOnPageLoad:true, //checks dA whenever a new page is loaded
			hideBar:true, //move bar down when not hovered
			barPosition:0, //0 left, 1 center, 2 right
			pulseNew:true, //red pulsing animation when entries are new
	};

	let temp={
			token:"", //csrf token. Needs to visit deviantart.com website to refresh
			lastCheck:0, //timestamp of last check done [s]
			lastResult:null, //{sumTotal:int, sumNew:int, sumNewCat:Map, sumOldCat:Map}
			lastRead:null, //{sumTotal:int, sumNew:int, sumNewCat:Map, sumOldCat:Map}
	};

	let div,cont,setdiv,style; //sidebar, content container, settings dialog
	let pageCheckCounter; //counter for how many notification pages are left to check

	let imgGear = '<svg  xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 20.444057 20.232336" > <g transform="translate(-15.480352,-5.6695418)">  <g transform="matrix(0.26458333,0,0,0.26458333,25.702381,15.78571)"  style="fill:#000000">  <path  style="fill:#000000;stroke:#000000;stroke-width:1"  d="m 28.46196,-3.25861 4.23919,-0.48535 0.51123,0.00182 4.92206,1.5536 v 4.37708 l -4.92206,1.5536 -0.51123,0.00182 -4.23919,-0.48535 -1.40476,6.15466 4.02996,1.40204 0.45982,0.22345 3.76053,3.53535 -1.89914,3.94361 -5.1087,-0.73586 -0.4614,-0.22017 -3.60879,-2.2766 -3.93605,4.93565 3.02255,3.01173 0.31732,0.40083 1.8542,4.81687 -3.42214,2.72907 -4.2835,-2.87957 -0.32017,-0.39856 -2.26364,-3.61694 -5.68776,2.73908 1.41649,4.0249 0.11198,0.49883 -0.41938,5.14435 -4.26734,0.97399 -2.6099,-4.45294 -0.11554,-0.49801 -0.47013,-4.2409 h -6.31294 l -0.47013,4.2409 -0.11554,0.49801 -2.6099,4.45294 -4.26734,-0.97399 -0.41938,-5.14435 0.11198,-0.49883 1.41649,-4.0249 -5.68776,-2.73908 -2.26364,3.61694 -0.32017,0.39856 -4.2835,2.87957 -3.42214,-2.72907 1.8542,-4.81687 0.31732,-0.40083 3.02255,-3.01173 -3.93605,-4.93565 -3.60879,2.2766 -0.4614,0.22017 -5.1087,0.73586 -1.89914,-3.94361 3.76053,-3.53535 0.45982,-0.22345 4.02996,-1.40204 -1.40476,-6.15466 -4.23919,0.48535 -0.51123,-0.00182 -4.92206,-1.5536 v -4.37708 l 4.92206,-1.5536 0.51123,-0.00182 4.23919,0.48535 1.40476,-6.15466 -4.02996,-1.40204 -0.45982,-0.22345 -3.76053,-3.53535 1.89914,-3.94361 5.1087,0.73586 0.4614,0.22017 3.60879,2.2766 3.93605,-4.93565 -3.02255,-3.01173 -0.31732,-0.40083 -1.8542,-4.81687 3.42214,-2.72907 4.2835,2.87957 0.32017,0.39856 2.26364,3.61694 5.68776,-2.73908 -1.41649,-4.0249 -0.11198,-0.49883 0.41938,-5.14435 4.26734,-0.97399 2.6099,4.45294 0.11554,0.49801 0.47013,4.2409 h 6.31294 l 0.47013,-4.2409 0.11554,-0.49801 2.6099,-4.45294 4.26734,0.97399 0.41938,5.14435 -0.11198,0.49883 -1.41649,4.0249 5.68776,2.73908 2.26364,-3.61694 0.32017,-0.39856 4.2835,-2.87957 3.42214,2.72907 -1.8542,4.81687 -0.31732,0.40083 -3.02255,3.01173 3.93605,4.93565 3.60879,-2.2766 0.4614,-0.22017 5.1087,-0.73586 1.89914,3.94361 -3.76053,3.53535 -0.45982,0.22345 -4.02996,1.40204 z"  />  <circle  style="fill:#ffffff;stroke:#000000;stroke-width:1"  cx="0"  cy="0"  r="15" />  </g>  </g> </svg>';
	let iconMap={ //sidebar icon map
			"llama":`<img src="data:image/gif;base64,R0lGODlhFAAbAMQZAJRPC++pQl0yEFUyEsJaKtGBKdGMJezJYvbhbuqwNLFtJ2NjPFkrFvjGRHx8SuqpJtWUNOOKJHV1PnFFLu6oQ10xDZVgLi4kHEonDf///wAAAAAAAAAAAAAAAAAAAAAAACH5BAEAABkALAAAAAAUABsAAAWBYCaOZGmeaKqubOuWmJDFLhZANl4nSIK9mEpC8Ks1BIhiCwNANJQsjAIQgK6YhYBMNegOsFruYXyQFgwP62hwiBQi5nP4BLAQLHi8wRAApAZ2gRYGFFsoAHeJFg99KxcMEwwAFwAMF44LF5kZmpcqFxIXDpeinp8XqJypL6ytrq4hADs=" />`,
			"deviation":"🎨",
			"comment":"💬",
			"mention":"📣",
			"transaction":"🚀",
			"watch":"📬",
			"adom":"⏰",
			"profile":"📝",
			"groups_correspondence":"📚",

			//old:
			/*  "Activity": "🔔",
			"Deviations": "🎨",
			"Journals": "🧾",
			"Group": "🗫",
			"Polls": "📊",
			"Forums": "💬",
			"Commissions": "🛒",
			"Status": "⏰",
			"Misc": "🧸",
			"Feedback": "📬",
			"Comments": "📝",
			"Replies": "🗐",
			"Mentions": "📣",
			"Activity": "🚀",
			"Correspondence": "📚",
			*/
	};


	function request(cursor=0){
			return new Promise(function(resolve, reject) {
					GM.xmlHttpRequest({
							method: "GET",
							url: `https://www.deviantart.com/_puppy/dashared/nc/drawer?cursor=${cursor}&csrf_token=${temp.token}` ,
							headers: {
									"accept": 'application/json, text/plain, */*',
									"content-type": 'application/json;charset=UTF-8'
							},
							onerror: function(response) {
									console.log("error:", response);
									reject(response);
							},
							onload: async function(response) {
									let dat;
									try {
											dat = JSON.parse(response.responseText);
											if(dat.status=="error" && dat?.errorDetails?.csrf){
													temp.token="expired";
													GM.setValue("temp",JSON.stringify(temp,replacer));
													updateHTML();
													reject(dat);
											}
											if (--pageCheckCounter!=0 && dat.hasMore) {
													request(dat.cursor).then(nret => {
															dat.results = dat.results.concat(nret.results);
															resolve(dat);
															return;
													});
											} else {
													resolve(dat);
											}
									} catch (e) {
											reject(e);
									}
							}
					});
			});
	}


	function init(){
			if(location.href.includes("deviantart.com")){
					temp.token=document.querySelector("input[name=validate_token]")?.value??temp.token;
					GM.setValue("temp",JSON.stringify(temp,replacer));
					return;
			}

			injectHTML();

			timer();
			setInterval(timer,settings.checkInterval*1e3);
	}

	function timer(){
			if(Date.now()/1e3-temp.lastCheck<settings.checkInterval){
					updateHTML();
					return;
			}

			pageCheckCounter=settings.quickCheck;
			request().then(ret=>{
					temp.lastCheck=Date.now()/1e3;

					let datNew = ret.results.filter(el=>el?.bucket?.countDetails?.length>0);
					// let sumtot=ret.results.length;
					let buckstr;

					let parseRes={
							sumTotal:ret.results.length,
							sumNew:0,
							sumNewCat:new Map(),
							sumOldCat:new Map(),
					}

					datNew.forEach(el=>{
							let sumEl=el.bucket.countDetails.reduce((acc,val)=>{return acc+val.newCount;},0);
							if(sumEl==0)sumEl=1;
							parseRes.sumNew+=sumEl;
							if(el.bucket?.bucket){
									buckstr=/bucket\.(\w+?)(\.|$)/.exec(el.bucket.bucket)[1];
									if(!parseRes.sumNewCat.has(buckstr))parseRes.sumNewCat.set(buckstr,sumEl);
									else parseRes.sumNewCat.set(buckstr,parseRes.sumNewCat.get(buckstr)+sumEl);
							}
					});

					parseRes.sumTotal=parseRes.sumTotal-datNew.length+parseRes.sumNew; //new entries have counters "newCount" that might be >1. subtract itemcount and add sum of counters.

					ret.results.forEach(el=>{
							//if(el?.bucket?.countDetails?.length>0)return; //only not new
							if(el.bucket?.bucket){
									buckstr=/bucket\.(\w+?)(\.|$)/.exec(el.bucket.bucket)[1];
									if(!parseRes.sumOldCat.has(buckstr))parseRes.sumOldCat.set(buckstr,1);
									else parseRes.sumOldCat.set(buckstr,parseRes.sumOldCat.get(buckstr)+1);
							}
					});

					temp.lastResult=parseRes;
					GM.setValue("temp",JSON.stringify(temp,replacer));
					updateHTML();
					highlight();
			});
	}

	function highlight(reset=false){
			div.classList.remove("dA_Sidebar2_newBar");
			document.querySelectorAll(".dA_Sidebar2_newEntr").forEach(el=>el.classList.remove("dA_Sidebar2_newEntr"));

			if(reset)return;

			let allread=true;
			if(temp?.lastResult?.sumNewCat.size!=temp?.lastRead?.sumNewCat.size)allread=false;

			[...temp.lastResult.sumNewCat.entries()].forEach(([key,val])=>{
					if(!(temp?.lastRead?.sumNewCat?.has(key) && temp.lastRead.sumNewCat.get(key)==val)){
							allread=false;
							document.querySelector("#dA_Sidebar2 span[title='"+key+"']").classList.add("dA_Sidebar2_newEntr");
					}
			});
			if(!allread){
					div.classList.add("dA_Sidebar2_newBar")
			}else{
					div.classList.remove("dA_Sidebar2_newBar")
			}

	/* GM_notification({
			text: "New Deviantart Notifications!",
			title: "dA Sidebar2",
			url: 'https:/deviantart.com/notifications',
			onclick: (event) => {
					//
			},
	});
	*/
	}

	function showSettings(){
			setdiv.style.display="block";
			let form=document.forms.dA_Sidebar2_form;
			form.elements.checkInterval.value=settings.checkInterval;
			form.elements.quickCheck.value=settings.quickCheck;
			form.elements.countNew.checked=settings.countNew;
			form.elements.checkOnPageLoad.checked=settings.checkOnPageLoad;
			form.elements.hideBar.checked=settings.hideBar;
			form.elements.barPosition[settings.barPosition].checked=true;
			form.elements.pulseNew.checked=settings.pulseNew;
	}
	function saveSettings(){
			setdiv.style.display="none";
			let form=document.forms.dA_Sidebar2_form;
			settings.checkInterval = parseInt(form.elements.checkInterval.value);
			if(settings.checkInterval<10)settings.checkInterval=10;
			settings.quickCheck = form.elements.quickCheck.value;
			if(settings.checkInterval<0)settings.checkInterval=0;
			settings.countNew = form.elements.countNew.checked;
			settings.checkOnPageLoad = form.elements.checkOnPageLoad.checked;
			settings.hideBar = form.elements.hideBar.checked;
			settings.pulseNew = form.elements.pulseNew.checked;

			document.forms.dA_Sidebar2_form.elements.barPosition.forEach((el,ind)=>{if(el.checked)settings.barPosition=ind});

			GM.setValue("settings",JSON.stringify(settings));

			updateHTML();
			insertStyle();//update view
	}

	function cropmin(val,min){
		let intval=parseInt(val);
		if(isNaN(intval)||intval<min)return min;
		return intval;
	}
	function injectHTML(){
			div =document.createElement("div");
			div.id="dA_Sidebar2";
			cont =document.createElement("div");
			cont.innerHTML=`Loading...`;
			cont.addEventListener("click",(ev)=>{
					temp.lastRead=temp.lastResult;
					highlight(true);
					GM.setValue("temp",JSON.stringify(temp,replacer));
			},false)
			div.append(cont);
			let setBut =document.createElement("button");
			setBut.innerHTML=imgGear;
			setBut.id="dA_Sidebar2_setButton";
			setBut.addEventListener("click",showSettings,false);
			div.append(setBut);
			// let closeBut =document.createElement("button");
			// closeBut.innerHTML="↓";
			// closeBut.id="dA_Sidebar2_closeButton";
			// closeBut.addEventListener("click",(ev)=>{div.style.transform="translate(0,100%)";},false);
			// div.append(closeBut);
			document.body.append(div);

			let settmp=`
			<form id='dA_Sidebar2_form'>
				<label for="checkInterval" title='min. 10 s'>
					<span>Update interval [s]</span>
					<input type="text" id="checkInterval" placeholder="min. 10 s"/>
				</label>
				<label for="quickCheck" title='0 = all. Latest 15 Notification per page.'>
					<span>Requested notification pages</span>
					<input type="text" id="quickCheck" placeholder="0 = all"/>
				</label>
				<label for="countNew" title='0 = all'>
					<span>Counts only unread notifications</span>
					<input type="checkbox" id="countNew"/>
				</label>
				<label for="checkOnPageLoad" title='Requests an update whenever a new page is visited'>
					<span>Update on pageload</span>
					<input type="checkbox" id="checkOnPageLoad"/>
				</label>
				<label for="hideBar" title='Hides notification bar except 2px. Hover there to show the bar again. '>
					<span>Hide sidebar</span>
					<input type="checkbox" id="hideBar"/>
				</label>
				<label for="pulseNew" title='Plays a pulse animation when new notifications appear. Click the bar to mark them as read.'>
					<span>Pulse animation on new notification</span>
					<input type="checkbox" id="pulseNew"/>
				</label>
				<label title='Alignment of sidebar at the bottom of the window.'>
					<span>SideBar position</span>
					<label for='barPositionL'><input type="radio" id="barPositionL" name='barPosition'/><span>Left</span></label>
					<label for='barPositionC'><input type="radio" id="barPositionC" name='barPosition'/><span>Center</span></label>
					<label for='barPositionR'><input type="radio" id="barPositionR" name='barPosition'/><span>Right</span></label>
				</label>
			</form>
			<button type="button" id='dA_Sidebar2_saveset'>Save</button>
			<button type="button" id='dA_Sidebar2_cancelset'>Cancel</button>
			`;

			setdiv=document.createElement("div");
			setdiv.innerHTML=settmp;
			setdiv.id="dA_Sidebar2_settings";
			document.body.append(setdiv);
			document.getElementById("checkInterval").addEventListener("focusout",(ev)=>{ev.target.value=cropmin(ev.target.value,10);},false);
			document.getElementById("quickCheck").addEventListener("focusout",(ev)=>{ev.target.value=cropmin(ev.target.value,0);},false);
			document.getElementById("dA_Sidebar2_saveset").addEventListener("click",saveSettings,false);
			document.getElementById("dA_Sidebar2_cancelset").addEventListener("click",()=>{setdiv.style.display="none";},false);
			
			insertStyle();
	}

	function insertStyle(){

		let styleText=`
			#dA_Sidebar2 {user-select:none;position: fixed;bottom: 0;width: 300px;height: auto;border: 1px solid black;
				${settings.barPosition==1?"left:50%;":settings.barPosition==2?"right:0;":"left: 0;"}
				border-top-right-radius: 5px;font-family: Georgia;font-size: 12pt;line-height: 16pt;color: black;
				background: linear-gradient(#cbf9b9,#7fc458);padding: 3px;padding-right:20px;z-index:7777777;
				box-sizing: content-box;${settings.hideBar?"transform:translateY(100%) translateY(-5px)"+(settings.barPosition==1?" translateX(-50%);":";"):settings.barPosition==1?"transform:translateX(-50%);":""}}
			#dA_Sidebar2:hover{${settings.barPosition==1?"transform:translateX(-50%);":"transform:none;"}}
			#dA_Sidebar2.dA_Sidebar2_newBar{border:1px solid red;${settings.pulseNew?"animation: dA_Sidebar2_pulse 1s ease-out infinite":""};}
			#dA_Sidebar2 span.dA_Sidebar2_newEntr{color:red;}
			#dA_Sidebar2 *{margin:0;padding:0;}
			#dA_Sidebar2 img {vertical-align: middle;height: 1.4em; display: inline-block;}
			#dA_Sidebar2 a {cursor:pointer;color:black;text-decoration:underline;}
			#dA_Sidebar2>div>span {margin: 0 5px;cursor:help;white-space: nowrap;}
			#dA_Sidebar2 button{position: absolute;line-height: 16pt!important;background: none;border: none;cursor: pointer;}
			#dA_Sidebar2 button:hover{filter: invert(10%) sepia(100%) saturate(5000%) hue-rotate(359deg) brightness(150%);}
			#dA_Sidebar2_setButton{top: 1px;right: 1px;width:20px;height:20px;}
			#dA_Sidebar2_closeButton{top: -4px;right: 20px;width: 12px;height: 20px;font-size: 17px;}
			#dA_Sidebar2_setButton svg{vertical-align:top;}
			@keyframes dA_Sidebar2_pulse {
					0%   { box-shadow: 0 0 0 red; }
					50%  { box-shadow: 0 0 17px red; }
					100% { box-shadow: 0 0 0 red; }
			}
			#dA_Sidebar2_settings {display:none;user-select:none;width:450px;height:340px;position:fixed;z-index:777777;border-radius:15px;border:1px solid black;box-shadow: 2px 2px 2px black;left:50%;top:50%;transform:translate(-50%,-50%);background-color:#90ca90;}
			#dA_Sidebar2_settings * {vertical-align:middle;}
			#dA_Sidebar2_settings, #dA_Sidebar2_settings span, #dA_Sidebar2_settings div, #dA_Sidebar2_settings label{font: 12pt Georgia normal normal normal!important;line-height: 16pt!important;color: black!important;padding:0!important;margin:0!important;}
			#dA_Sidebar2_settings form > label > span {width: 220px;  display: inline-block!important;}
			#dA_Sidebar2_settings label{padding: 5px 0!important;cursor:help!important;}
			#dA_Sidebar2_settings form{display:grid;padding: 10px!important;}
			#dA_Sidebar2_settings input[type="text"] {  width: 180px;  height:20px; font: 12pt georgia normal normal normal !important; padding: 2px; margin: 0;border:none;  border-radius: 5px;}
			#dA_Sidebar2_settings input[type='checkbox']{cursor:pointer;  width: 40%;  height: 20px;margin:0;}
			#dA_Sidebar2_settings input[type='radio']{cursor:pointer;  width: 15px;  height: 15px;margin:0;vertical-align:middle;}
			#dA_Sidebar2_settings label span{margin: 0 5px!important;}
			#dA_Sidebar2_settings form>label { border-bottom: 1px dashed gray;}
			#dA_Sidebar2_settings button{position:absolute;bottom:10px;transform:translateX(-50%);padding: 5px 20px;box-shadow: 1px 1px;cursor: pointer;  border-radius: 5px;color: black;}
			#dA_Sidebar2_saveset {left:33%;background: linear-gradient(#c7e8a5, #99d01f);}
			#dA_Sidebar2_settings button:hover{  filter: brightness(110%);}
			#dA_Sidebar2_settings button:active{  filter: brightness(90%);box-shadow: 1px 1px inset;}
			#dA_Sidebar2_cancelset {left:66%;background:linear-gradient(#ffe3e3, #fd9c91)}
			`;

		if(style==null){
			style=document.createElement('style');
			style.id='dA_Sidebar2_style';
			let head=document.getElementsByTagName('head')[0];
			if(!head)document.body.appendChild(style);
			else document.head.appendChild(style);
		}

		style.innerHTML=styleText;
	}


	function updateHTML(){
			if(temp?.token=="expired"){
					cont.innerHTML="Expired! Refresh authentification by visiting <a href='https://deviantart.com' target='_blank'>deviantart.com</a>.";
			}else{
				let mapstr;
				if(settings.countNew){
						mapstr="<span>"+[...temp.lastResult.sumNewCat.entries()].map(([key,val])=>`<span title=${key}>${iconMap[key]??key} ${val}</span>`).join("</span><span>")+"</span>";
						cont.innerHTML=`New (<a target="_blank" href="https://www.deviantart.com/notifications">${temp.lastResult.sumNew}</a>): ${mapstr}`;
				}else{
						mapstr="<span>"+[...temp.lastResult.sumOldCat.entries()].map(([key,val])=>`<span title=${key}>${iconMap[key]??key} ${val}</span>`).join("</span><span>")+"</span>";
						cont.innerHTML=`New (<a target="_blank" href="https://www.deviantart.com/notifications">${temp.lastResult.sumTotal}</a>): ${mapstr}`;
					}
			}
	}



	//replacer/reviver for JSON.stringify/parse and Map objects
	function replacer(key, value) {
			return (value instanceof Map) ? {dataType: 'Map', value:  [...value]} : value;
	}
	function reviver(key, value) {
			return (typeof value === 'object' && value !== null && value.dataType === 'Map') ?  new Map(value.value) : value;
	}

	Promise.all([
			GM.getValue("settings",JSON.stringify(settings)),
			GM.getValue("temp",JSON.stringify(temp,replacer))
	]).then(res=>{
			console.log(res);
			settings=JSON.parse(res[0]);
			temp=JSON.parse(res[1],reviver);
			if(settings.checkOnPageLoad)temp.lastCheck=0;
			init();
	});


})();