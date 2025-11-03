// ==UserScript==
// @name        bildhigh
// @namespace   magnifier
// @include     http://e621.net/post/*
// @include     https://e621.net/post/*
// @version     1
// ==/UserScript==
(function(){
	console.log("st");
	if(window.self != window.top || window.location.href.search(/e621\.net\/post\/index/i)==-1)return;
	
	console.log("url");
	var page=/page=(\d+)/.exec(window.location.href);
	if(page!=null)page=page[1];else return;
	var buts=document.getElementById("paginator").getElementsByTagName("A");
	console.log("s");
	buts[0].setAttribute("href","/post/index?page="+(parseInt(page)-1));
	buts[1].setAttribute("href","/post/index?page="+(parseInt(page)+1));
})();
(function(){
	if(window.self != window.top || window.location.href.search(/e621\.net\/post\/show/i)==-1)return;
	var butt=document.getElementById("highres");
	var bild=document.getElementById("image");

	function clicker(){
		console.log("hui!");
		var v1=bild.getAttribute("width");
		var v2=bild.getAttribute("height");
		bild.setAttribute("src",document.getElementById("highres").getAttribute("ahref"));
		bild.setAttribute("width",bild.getAttribute("data-orig_width"));
		bild.setAttribute("height",bild.getAttribute("data-orig_height"));
		bild.setAttribute("data-orig_width",v1);
		bild.setAttribute("data-orig_height",v2);
		return false;
	}
	var css=document.createElement('style');
	css.type = "text/css";
	css.innerHTML="#highres{cursor:pointer;color:#B4C7D9;}#highres:hover{color:#2E76B4;}";
	document.getElementsByTagName("head")[0].appendChild(css);

	//prefetch:
	prefetch=true;
	if(prefetch){
		var preimg=document.createElement("img");
		preimg.setAttribute("src",butt.getAttribute("href"));
		preimg.setAttribute("style","visibility:hidden;");
		document.getElementsByTagName("body")[0].appendChild(preimg);
	}
	  
	butt.addEventListener("click",clicker, false);
	bild.addEventListener("click",clicker, false);
	
	butt.setAttribute("onclick","return false;");
	butt.setAttribute("ahref",butt.getAttribute("href"));
	butt.removeAttribute("href");
	
	setTimeout(function(){bild.setAttribute("style","height:auto;max-width:100%");},500);
	

	//autofullview:
	autofullview=false;
	if(autofullview)setTimeout(clicker,2000);
})();