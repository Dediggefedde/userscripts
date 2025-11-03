// ==UserScript==
// @name         dA_profile_fullnumbers
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  replaces profile statistics with full numbers
// @author       dediggefedde
// @match        https://www.deviantart.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=deviantart.com
// @grant        none
// ==/UserScript==

(function() {
	'use strict';

	//extract a number e.g. "param\":123" from tex and replaces the profile number "word: ##.#" with it.
	//tex: text containing words, param: keyword in tex to search for, word: indicator in DOM to replace number at
	function replnumber(tex,param,word){
			let num=parseInt(tex.substr(tex.indexOf(param)+param.length+3)); //+3 for \":
			//let nod = document.evaluate("//span[contains(., '"+word+"') and not(@data-hook)]/*[(self::span|self::div) and not(@dA_pf_changed) and not(@data-hook)]", document, null, XPathResult.ANY_TYPE, null ); //sometimes span or div
			let nod = document.evaluate("//h1/parent::*//span[contains(., '"+word+"')]/*[(self::span|self::div) and not(@dA_pf_changed)]", document, null, XPathResult.ANY_TYPE, null ); //sometimes span or div
			let el=nod.iterateNext();
			if(el!=null){
					el.innerHTML=num;
					el.setAttribute("dA_pf_changed",1); //not replace twice
					el.replaceWith(el.cloneNode(true)); //prevent default hover/click
			}
	}

	//script execution. called repeatedly for react-based navigation where things change without pageload.
	function init(){
			let tex=document.body.innerHTML.substring(document.body.innerHTML.indexOf("window.__INITIAL_STATE__")); //parameters in initial_state string
			if(tex.indexOf("window.__APP_INFO__ = 'da-user-profile:ga:")==-1)return; //check for profile page

			tex=tex.substring(tex.indexOf("profileOwner\\\"")) ; //hard text-parsing for keywords
			tex=tex.substring(tex.indexOf("stats\\\"")) ;

			replnumber(tex,"pageviews","Pageviews");
			replnumber(tex,"commentsMade","Comments");
			replnumber(tex,"watchers","Watchers");
			replnumber(tex,"deviations","Deviations");
			replnumber(tex,"favourites","Favourites");

	}

	init();
	setInterval(init,2000); //check every 2 seconds

})();