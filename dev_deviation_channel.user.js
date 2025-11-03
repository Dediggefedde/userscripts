// ==UserScript==
// @name         dev_Deviation_Channel
// @namespace    http://phi.pf-control.de
// @version      1.0
// @description  Adds a Channel plus button for DDs, Searches and galleries to the top navigation
// @author       Dediggefedde
// @match        *://*.deviantart.com/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.addStyle
// @grant        GM.xmlHttpRequest
// @noframes
// ==/UserScript==
/* globals $*/

(function() {
    'use strict';
    var targetURL = "https://www.deviantart.com/daily-deviations";//""https://www.deviantart.com/topic/digital-art";
    //"https://www.deviantart.com/"
    //"https://www.deviantart.com/daily-deviations"
    //"https://www.deviantart.com/topic/digital-art"
    var scanInterval=60;//seconds
    var scrollInterval=5;
    var targetImages = []; //{title,url,imageUrl}
    var litImg="data:image/png;base64,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";
    var scrollTimer;
    var scrollDir=0;
    var scrollTopPos=0;
    var scrollTopDir=0;

    function requestURL() { //async+callback //load all groups
        return new Promise(function(resolve, reject) {
            GM.xmlHttpRequest({
                method: "GET",
                url: targetURL,
                onerror: reject,
                onload: resolve
            });
        });
    }
    function addNavigationEvents(){
        $("button[role='openTarget']").click(function(){
            window.open(targetURL);
        });
        $("button[role='changeTarget']").click(function(){
            var ntargetURL=prompt("Website-URL where images are taken from",targetURL);
            if(ntargetURL!=targetURL && ntargetURL!="" && ntargetURL!=null){
                targetURL=ntargetURL;
                $(this).attr("title",targetURL);
                $("button[role='openTarget']").attr("title",targetURL);

                requestURL().then(parseImages).then(fillImages);
                GM.setValue("targetURL",targetURL);
            }
        });
        $("button[role='refreshRate']").click(function(){
            var nscanInterval=prompt("Period of time after which target-URL is called again",scanInterval);
            if(nscanInterval!=scanInterval && nscanInterval!="" && nscanInterval!=null){
                scanInterval=parseInt(nscanInterval);
                $(this).html(`Scan Interval ${scanInterval}`);
                GM.setValue("scanInterval",scanInterval);
            }
        });
        $("button[role='scrollRate']").click(function(){
            var nscrollInterval=prompt("Timer after which the bar scrolls. 0 for no scrolling.",scrollInterval);
            if(nscrollInterval!=scanInterval && nscrollInterval!="" && nscrollInterval!=null){
                scrollInterval=parseInt(nscrollInterval);
                $(this).html(`Scroll Interval ${nscrollInterval}`);
                GM.setValue("scrollInterval",scrollInterval);

                clearInterval(scrollTimer);
                if(scrollInterval>0){
                 scrollTimer=setInterval(scroller,scrollInterval*1000);
                }
            }
        });
        $("button[role='scrollLeft']").click(function(){
            var el=$("div[role='dDC_chWrap']");
            var leftPos = el.scrollLeft();
            el.animate({scrollLeft: leftPos - el.width()}, 200);
        });
        $("button[role='scrollRight']").click(function(){
            var el=$("div[role='dDC_chWrap']");
            var leftPos = el.scrollLeft();
            el.animate({scrollLeft: leftPos + el.width()}, 200);
        });
    }

    function fillImages() {
        if(targetImages.length==0)return;
        var ch = $("#dDC_channel");
        if (ch.length == 0) {
            ch = $(`<div id='dDC_channel'>
            <div id='dDC_navigation'>
               <button role='scrollLeft'>&lt;</button>
               <button role='openTarget' title='${targetURL}'>Open Target page</button>
               <button role='changeTarget' title='${targetURL}'>Change Target page</button>
               <button role='refreshRate'>Scan Interval ${scanInterval}</button>
               <button role='scrollRate'>Scroll Interval ${scrollInterval}</button>
               <button role='scrollRight'>&gt;</button>
           </div>
           <div role='dDC_chWrap'></div>
           </div>`);
            ch.hide();
            $("header[role='banner']").after(ch);
            addNavigationEvents();
        } else {
            $("div[role='dDC_chWrap']").empty();
        }
        ch=$("div[role='dDC_chWrap']").empty();
        targetImages.forEach((el) => {
            if(el.imageUrl==undefined){
                ch.append(`<a href='${el.url}'><div class='dDC_litImg'>${el.title}</div></a>`);
            }else{
                ch.append(`<a href='${el.url}'><img src='${el.imageUrl}' title='${el.title}'/></a>`);
            }
        });


        $("#dDC_menu img[role=dDC_prev1]").attr("src", targetImages[0].imageUrl?targetImages[0].imageUrl:litImg);
        $("#dDC_menu img[role=dDC_prev2]").attr("src", targetImages[1].imageUrl?targetImages[1].imageUrl:litImg);
        $("#dDC_menu img[role=dDC_prev3]").attr("src", targetImages[2].imageUrl?targetImages[2].imageUrl:litImg);

    }

    function scroller(){
        var el=$("div[role='dDC_chWrap']");
        var leftPos = el.scrollLeft();
        var delta= el.width()/2;
        var totalWidth=el.get(0).scrollWidth;

        if(scrollDir==0)delta= el.width()/2;
        else if(scrollDir==1)delta= -el.width()/2;

        if(leftPos==0)scrollDir=0;
        else if(leftPos+delta>=totalWidth-el.width())scrollDir=1;

        el.animate({scrollLeft: leftPos +delta}, 200);


        if(scrollTopDir==0)scrollTopPos=scrollTopPos+1;
        else if(scrollTopDir==1)scrollTopPos=scrollTopPos-1;

        if(scrollTopPos==0)scrollTopDir=0;
        else if(scrollTopPos==targetImages.length-3)scrollTopDir=1;

        $("#dDC_menu img[role=dDC_prev1]").attr("src", targetImages[scrollTopPos].imageUrl?targetImages[scrollTopPos].imageUrl:litImg);
        $("#dDC_menu img[role=dDC_prev2]").attr("src", targetImages[scrollTopPos+1].imageUrl?targetImages[scrollTopPos+1].imageUrl:litImg);
        $("#dDC_menu img[role=dDC_prev3]").attr("src", targetImages[scrollTopPos+2].imageUrl?targetImages[scrollTopPos+2].imageUrl:litImg);

    }
    function parseImages(resp) { //TODO in some collection multiple entries for a[data-hook] per dev, no title/image, though, also todo: literature iamge
        return new Promise((resolve, reject) => {
            try {
                targetImages = $(resp.responseText).find("section[data-hook='deviation_std_thumb']").map((ind, el) => { //search, gallery and browse pages
                    return ({
                        url: $(el).find("a[data-hook='deviation_link']").first().attr("href"),
                        title: $(el).find("img").attr("alt"),
                        imageUrl: $(el).find("img").attr("src")
                    });
                }).toArray();
                if (targetImages.length == 0) { //DDs
                    targetImages = $(resp.responseText).find("a[data-hook='deviation_link']").map((ind, el) => { //DDs
                        return ({
                            url: $(el).attr("href"),
                            title: $(el).attr("title"),
                            imageUrl: $(el).find("img").attr("src")
                        });
                    }).toArray();
                }
                GM.setValue("targetImages", JSON.stringify(targetImages));
                GM.setValue("lastRequest", (new Date()).getTime() / 1000);
                resolve(targetImages.length);
            } catch (ex) {
                reject(ex);
            }
        });
    }

    $(document).ready(function() {
        var but = $(`<div id='dDC_menu'>
			<div><img role='dDC_prev1' /></div>
			<div><img role='dDC_prev2' /></div>
			<div><img role='dDC_prev3' /></div>
		</div>`);
        $("div[role=navigation]").after(but);
        but.click(function() {
            if (targetImages.length == 0) return;
            $("#dDC_channel").toggle();
        });

        GM.addStyle(`
			#dDC_menu {height:100%;position:relative;cursor:pointer;width:150px;display: flex;align-items: center;}
			#dDC_menu div {margin:1px;vertical-align:middle;width:48px;text-align:center;height:100%;display:flex;justify-content:center;align-items:center;}
			#dDC_menu img {max-width:50px;}
			#dDC_menu img[role=dDC_prev1], #dDC_menu img[role=dDC_prev3]{height:40%;}
			#dDC_menu img[role=dDC_prev2] {height:80%;}
			#dDC_channel {height: 300px;position:absolute;top:54px;z-index:99;width:100%;}
			#dDC_channel div[role='dDC_chWrap'] {padding:5px;height:100%;overflow: hidden;overflow-x: scroll;display: flex;align-items: center;background:var(--L1);}
			#dDC_channel a {display:contents;}
			#dDC_channel a img{height:100%;margin:5px;}
			#dDC_channel div.dDC_litImg{height: 100%;margin:5px;background: linear-gradient(180deg,transparent,rgba(6,7,13,.5));font-size: 30px;width: 200px;display: flex;align-items: center;color: var(--D8);padding: 10px;}
			#dDC_navigation {background: white;width: 100%;display: flex;justify-content: center;}
			#dDC_navigation button {padding: 5px;background-color: var(--L20);border: none;border-radius: 3px;margin: 5px;color: var(--L21);cursor: pointer;font-weight: bold;}
			#dDC_navigation button:active {color:var(--L22);}
		`);

        //loading stored values
        var promises=[GM.getValue('targetImages',""),
                      GM.getValue('targetURL',targetURL),
                      GM.getValue('lastRequest',0),
                      GM.getValue('scanInterval',scanInterval),
                      GM.getValue('scrollInterval',scrollInterval)
                     ];
        Promise.all(promises).then(item=>{
            targetURL=item[1];
            scanInterval=item[3];
            scrollInterval=item[4];

            try {
                if (item[0] != "") {
                    targetImages = JSON.parse(item[0]);
                } else {
                    targetImages = [];
                }
            } catch (ex) { //bad formatting?
                targetImages = [];
            }
            fillImages();

            var now = (new Date()).getTime() / 1000; // seconds since Jan 1, 1970, 00:00:00.000 GMT
            if (item[2] == 0 || now - item[2] > scanInterval || targetImages.length == 0) { //1min
              requestURL().then(parseImages).then(fillImages);
            }
            if(scrollInterval>0){
                scrollTimer=setInterval(scroller,scrollInterval*1000);
            }
        });

    });
    $(document).mouseup(function(event) {
        if ($(event.target).closest("#dDC_channel, #dDC_menu").length == 0) $("#dDC_channel").hide();
    })

})();