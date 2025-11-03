// ==UserScript==
// @name        TestPDF
// @namespace   testPDF
// @match     	*://*.tgchan.org/*
// @version     1.23
// @grant       none
// @require		https://raw.githubusercontent.com/MrRio/jsPDF/master/dist/jspdf.min.js
// ==/UserScript==

// // // @require     http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js
var tgchan2PDF=function(){
	var self_=this;
	//page setup
	var doc = new jsPDF('p','in','a4', true); //a4=8.3*11.7, inch units, portait format
	self_.pageWidth=8.3, pageHeight=11.7;
	
	self_.lineHeight=1.3;
	
	self_.normalsize = 12;
	self_.smallsize=10;
	self_.postHeaderSize=14;
	self_.pageHeaderSize=12;
	
	self_.margin = 0.8; // inches on a 8.5 x 11 inch sheet.
	self_.smallImgWidth=0.4;
	self_.postDivider=false;
	self_.postHeader=true;
	self_.pageHeader=true;
	self_.title = "test";
	self_.imgwidh=0.9*self_.pageWidth -2*self_.margin;
	self_.imgCompression="NONE"; //"NONE","FAST","MEDIUM","SLOW"
	self_.jpgQuality=0.8;
	
	self_.progressCallback=function(phase, index, thumbs, posts){console.log(phase, index, thumbs, posts);};

	//text properties
	var TSettings={
		page: 			1,
		color: 			{r:0,g:0,b:0},
		isbold:			false, 
		isitalic:		false, 
		isunderlined:	false, 
		isstrike: 		false,
		monospace: 		false,
		size:			self_.normalsize
	}

	//code relevant variables
	var verticalOffset = self_.margin;
	var rat;
	var elem = document.createElement('textarea'); 
	var id=0;
	var ratsThumb=[];
	var ratsSmall=[];
	var smallImgMap=[];
	var smallId=0;
	var lastw=0,lastp=0;
	var monospaceWidth=0.6;
	var insideTag=false;
	var writeLink="";
	var linkmap={}; //{pageNumber:2, top:4}
	var styles=[];
	// var img;
	var smallUrlList=[];
	var imgCounter=[0,0];
	var thumbs;
	var posts;

	//private functions
	function setTcolor(r,g,b){
		TSettings.color.r=r;
		TSettings.color.g=g;
		TSettings.color.b=b;
		doc.setTextColor(r,g,b);
	}

	function setTextStyle(){
		doc.setFontSize(TSettings.size);
		doc.setTextColor(TSettings.color.r,TSettings.color.g,TSettings.color.b);
		
		if(TSettings.isbold && !TSettings.isitalic)doc.setFontStyle("bold");
		else if(!TSettings.isbold && TSettings.isitalic)doc.setFontStyle("italic");
		else if(TSettings.isbold && TSettings.isitalic)doc.setFontStyle("bolditalic");
		else if(!TSettings.isbold && !TSettings.isitalic)doc.setFontStyle("normal");
		
		if(TSettings.monospace)
			doc.setFont("monospace");
		else
			doc.setFont("serif");
	}

	function newpage(){	
		doc.addPage();
		++TSettings.page; 
		if(self_.pageHeader){	
				doc.setFont("serif");
				doc.setFontSize(self_.pageHeaderSize);
				setTcolor(0,0,0);
				doc.setFontStyle("normal");
				doc.text(self_.title,self_.margin*3/4,self_.margin*3/4-4/72);
				doc.text(""+TSettings.page,self_.pageWidth-self_.margin*3/4-(doc.getStringUnitWidth(""+TSettings.page)*self_.pageHeaderSize/72),self_.margin*3/4-4/72);
				
				doc.setLineWidth(1/72); //2pt
				doc.setDrawColor(0,0,0);	
				doc.line(self_.margin/2,self_.margin*3/4,self_.pageWidth-self_.margin/2,self_.margin*3/4);
				
				setTextStyle(); //reset to old textstyle
			}
		verticalOffset=self_.margin;	
	}

	 // if($("img.thumb").length>0){
	function getBase64Image(Timg) {
		// console.log(Timg,self_);
		var canvas = document.createElement("canvas");
		canvas.width = Timg.width*self_.jpgQuality;///2;
		canvas.height = Timg.height*self_.jpgQuality;///2;
		var ctx = canvas.getContext("2d");
		ctx.drawImage(Timg,0,0,canvas.width,canvas.height);//, 0, 0, 800,600,0,0,canvas.width,canvas.height);
		var dataURL;
		// if(img.src.substr(-3).toLowerCase()=="png"){
			// dataURL = canvas.toDataURL();
		// }else{
			dataURL = canvas.toDataURL("image/jpeg");
			// console.log(canvas.toDataURL("image/jpeg"), canvas.toDataURL("image/png"));
		// }
		// console.log(canvas.width,img.width,dataURL);
		return dataURL;//.replace(/^data:image\/(png|jpg);base64,/, "");
	}
	function renderword(tex,j){
		var sword=tex.substr(lastp,j-lastp);
		var word=sword.replace(/<\/?.*?(>|$)/g,"");
		var add=tex[j]==" "?" ":"";
		elem.innerHTML = word;
		word=elem.value;
		var leng=doc.getStringUnitWidth(word+add)*TSettings.size/72;
		if(TSettings.monospace)leng=(word+add).length*monospaceWidth*TSettings.size/72
		if(lastw+leng+2*self_.margin>self_.pageWidth){
			verticalOffset+=TSettings.size*self_.lineHeight/72;
			lastw=0;
		}
		if(verticalOffset>pageHeight-self_.margin){
			newpage();
				// doc.text("test2",0,verticalOffset);
		}
			doc.text(word, self_.margin+lastw,verticalOffset);
		if(writeLink in linkmap){
			doc.link(self_.margin+lastw, verticalOffset-TSettings.size/72, -(self_.margin+lastw)/72 + (self_.margin+lastw)+leng, TSettings.size/36-pageHeight, linkmap[writeLink]);
			// doc.textWithLink(word, self_.margin+lastw, verticalOffset, linkmap[writeLink]);
		}
			
		if(TSettings.isunderlined||TSettings.isstrike){
			doc.setLineWidth(1/72); //2pt
			doc.setDrawColor(0,0,0);	
			if(TSettings.isunderlined)
				doc.line(self_.margin+lastw,verticalOffset+2/72,self_.margin+lastw+leng,verticalOffset+2/72); //2pt under text
			else if(TSettings.isstrike)
				doc.line(self_.margin+lastw,verticalOffset - TSettings.size/2/72,self_.margin+lastw+leng,verticalOffset-TSettings.size/2/72); //2pt under text
				
		}
		lastw+=leng;
		lastp+=sword.length+add.length;	
	}
	function getText(elems){ //like Sizzle
		 var ret = "", elem;
		if(elems===null)return ret;
		
		for ( var i = 0; elems[i]; i++ ) {
		elem = elems[i];

		// Get the text from text nodes and CDATA nodes
		if ( elem.nodeType === 3 || elem.nodeType === 4 ) {
			ret += elem.nodeValue;

		// Traverse everything else, except comment nodes
		} else if ( elem.nodeType !== 8 ) {
			ret += getText( elem.childNodes );
		}
		}

		return ret;
	}
	function loadposts(ind){ //each post
					
		TSettings.isbold=false, TSettings.isitalic=false; //standard font
		insideTag=false; //cursor inside a tag
		styles=[]; //stack of active styles to counter on next </span>
		
		var hasimg=posts[ind].querySelectorAll("img.thumb").length>0;
		
		verticalOffset+=TSettings.size/36; //empty line in front of new post
		
		if(hasimg && self_.imgwidh/ratsThumb[id]+verticalOffset+self_.margin>pageHeight){	//pagebreak for images
			newpage();
				// doc.text("test3",0,verticalOffset);
		}
		if(self_.postHeader){
			var horOff=self_.margin;
			doc.setFontStyle("bold");
			doc.setFontSize(self_.postHeaderSize);
			
			var postSeg=getText(posts[ind].querySelector("span.fileself_.title")).replace(/\r|\n/gi,""); //self_.title
			if(postSeg!=""){
				doc.setTextColor(255,0,0);
				doc.text(postSeg,horOff,verticalOffset);
				horOff+=doc.getStringUnitWidth(postSeg+" ")*self_.postHeaderSize/72;
			}
			postSeg=getText(posts[ind].querySelector("span.postername")).replace(/\r|\n/gi,""); 
			if(postSeg!=""){
				doc.setTextColor(0,140,0);
				doc.text(postSeg,horOff,verticalOffset);
				horOff+=doc.getStringUnitWidth(postSeg+" ")*self_.postHeaderSize/72;
			}
			postSeg=getText(posts[ind].querySelector("span.uid")).replace(/\r|\n/gi,""); 
			if(postSeg!=""){
				postSeg="("+postSeg+")";
				doc.setTextColor(140,140,140);
				doc.text(postSeg,horOff,verticalOffset);
				horOff+=doc.getStringUnitWidth(postSeg+" ")*self_.postHeaderSize/72;
			}		
			postSeg=getText(posts[ind].querySelectorAll("span.reflink a")[1]).replace(/\r|\n/gi,""); 
			if(postSeg!=""){
				postSeg=postSeg;
				doc.setTextColor(50,0,0);
				doc.setFontSize(self_.smallsize);
				doc.text(postSeg,horOff,verticalOffset);
				linkmap[postSeg]={pageNumber:TSettings.page, top:verticalOffset-self_.postHeaderSize/72};
				horOff+=doc.getStringUnitWidth(postSeg+" ")*self_.postHeaderSize/72;
			}
			
			// doc.setFontStyle("normal");
			// size=self_.normalsize;
			// doc.setFontSize(size);
			verticalOffset+=self_.postHeaderSize/48;
			
			setTextStyle(); //reset text style
		}
		
		if(hasimg){
			try{ //image insertion. all images use png mode, jpg/gif files supported
				doc.addImage("thumb"+id, (self_.pageWidth-self_.imgwidh)/2, verticalOffset, self_.imgwidh, self_.imgwidh/ratsThumb[id]);
			}catch(e){
				console.log("thumb"+id,(self_.pageWidth-self_.imgwidh)/2,verticalOffset,self_.imgwidh,ratsThumb[id],e);
			}	
			verticalOffset+=self_.imgwidh/ratsThumb[id]+TSettings.size/36; //keep track of vertical offset: add the image-Height in inch
			id++;	
		}
		
		var zwitex=posts[ind].querySelector("blockquote").innerHTML; //text in HTML
		// var zwiInd=zwitex.indexOf("<span style=\"white-space: pre-wrap");
		zwitex=zwitex.replace(/\n|\r/g,"##n##").split("<br>"); //replace text-newline with ##n## (for pre-wrap) and treat <br> as paragraphs
		
		for(var i=zwitex.length-1;i>0;--i){
			if(zwitex[i].replace(/##n##/gi,"")=="")zwitex.splice(i,1);
			else break;
		}
		
		for(var i=0;i<zwitex.length;++i){ //each paragraph
			setTcolor(0,0,0);
			TSettings.monospace=false;
			setTextStyle();
			
			lastp=0;lastw=0; //each paragraph starts at character (lastp) 0, and is printed at horiz. offset 0 (lastw)
			insideTag=false;
			if(zwitex[i].indexOf("<img ")!=-1){ //insert small images in text
				lastw=self_.smallImgWidth;
				var smimgheigh=self_.smallImgWidth/ratsSmall[smallImgMap[smallId]];
				if(verticalOffset+smimgheigh+self_.margin>pageHeight){ //pagebreak on small images
					newpage();		
				// doc.text("test4",0,verticalOffset);		
				}
				if(typeof smallImgMap[smallId]!="undefined"){ //insert image if exists. use imgMap to load imgs only once and then from cache
					doc.addImage("small"+smallImgMap[smallId], self_.margin, verticalOffset, self_.smallImgWidth, smimgheigh);
				}
				verticalOffset+=smimgheigh; //keep track of vertical offset: add small img's height
				smallId++;
			 }
			
			for(var j=0;j<zwitex[i].length;++j){ //each word
				if(zwitex[i][j]=="<")insideTag=true;
				if(zwitex[i][j]==">")insideTag=false;
				
				if(zwitex[i].substr(j,5)=="##n##"){ //ignore text newline \n. in pre-wrap case, all ##n## tags are replaced by <br> untill next </span
					renderword(zwitex[i],j); //render text until self_ point with previous settings
					zwitex[i]=zwitex[i].substr(j+5);	
					j=-1;
					continue;
				}
				
				if(zwitex[i].substr(j,20)=="<span style=\"color:#"){ //green color on >>, styles-stack gets "color"
					renderword(zwitex[i],j);
					var cols=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(zwitex[i].substr(j));
					if(cols!==null){
						setTcolor(parseInt(cols[1],16),parseInt(cols[2],16),parseInt(cols[3],16));
						styles.push("color");	
					}
				}else if(zwitex[i].substr(j,31)=="<span style=\"font-size:small;\">"){ //green color on >>, styles-stack gets "color"
					renderword(zwitex[i],j);
					styles.push("size");
					TSettings.size=self_.smallsize;				
					// doc.setFontSize(size);
					j+=30;
					insideTag=false;
				}else if(zwitex[i].substr(j,22)=="<span class=\"unkfunc\">"){ //green color on >>, styles-stack gets "color"
					renderword(zwitex[i],j);
					styles.push("color");
					setTcolor(0,100,0);
					// doc.setTextColor(0,100,0);
					j+=21;
					insideTag=false; //tag is stepped over.
				}else if(zwitex[i].substr(j,20)=="<span class=\"spoiler"){ //gray color on [spoiler], styles-stack gets "color"
					renderword(zwitex[i],j);
					styles.push("color");
					setTcolor(150,150,150);
					// doc.setTextColor(150,150,150);
					j+=20;
				}else if(zwitex[i].substr(j,94)=="<span style=\"white-space: pre-wrap !important; font-family: monospace, monospace !important;\">"){ //switch to courier on pre-wrap
					renderword(zwitex[i],j);
					
					var neuel=zwitex[i].substr(j+94) //treat all ##n## until the next </span as paragraphs, too
					neuel=neuel.substr(0,neuel.indexOf("</span")).split("##n##");
					if(neuel.length>1){
						zwitex[i]=neuel.splice(0,1)[0];	//splitting the current array element and replacing it with the result
						for(var k=0;k<neuel.length;++k)
							zwitex.splice(i+k+1,0,neuel[k]);
					}else{
						zwitex[i]=zwitex[i].substr(j+94); //no linebreak in white-space
					}

					styles.push("font");
					// doc.setFont('monospace'); //monospace is actually courier
					TSettings.monospace=true; //flag used in rendertext to correct character-width calculations
					// doc.setFontSize(size); 
					// j+=93;
					insideTag=false; //also false as we cut away the tag from zwitex[i]
					setTextStyle();
					continue;
				}else if(zwitex[i].substr(j,8)=="<a href="){		//link color	
					doc.setTextColor(0,0,255);	
					var subtex=zwitex[i].substr(j);
					subtex=subtex.substr(0,subtex.indexOf(">"));
					var res=/return highlight\('(\d+)'/gi.exec(subtex);
					// console.log(res,subtex);
					if(res!=null){
						writeLink=res[1];
					}
					styles.push("color");
				}else if(zwitex[i].substr(j,57)=="<span style=\"font-family: Mona,'MS PGothic' !important;\">"){		//TTF font
					renderword(zwitex[i],j); //basically same as pre-wrap, but without special treatment of \n
					styles.push("font");
					TSettings.monospace=true;
					// doc.setFont('monospace');
					// monospace=true;
					// doc.setFontSize(size);				
					j+=56;
					insideTag=false;
					setTextStyle();
					continue;
				}else if(zwitex[i].substr(j,4)=="</a>"){		//unstyle
					renderword(zwitex[i],j);	
					setTcolor(0,0,0);
					// doc.setTextColor(0,0,0);					
					// isunderlined=false;
					TSettings.isunderlined=false;
					writeLink="";
					insideTag=false;
					j+=3;				
				}else if(zwitex[i].substr(j,7)=="</span>"){		//unstyle
					renderword(zwitex[i],j);
					var spanMode=styles.pop(); //counters all style tags in the order of their appearing. requires every <span> to add a style-element
					if(spanMode=="font"){
						TSettings.monospace=false;
						// doc.setFont('serif');
						// doc.setFontSize(size);
						// monospace=false;
					}else if(spanMode=="color"){		
						setTcolor(0,0,0)
						// doc.setTextColor(0,0,0);					
					}else if(spanMode=="size"){					
						TSettings.size=self_.normalsize;
						// doc.setFontSize(size);
					}else if(spanMode=="underline"){					
						TSettings.isunderlined=false;
					}
					
				}else if(zwitex[i].substr(j,3)=="<i>"){		//<i>
					// if(!isbold)
						// doc.setFontStyle("italic");
					// else
						// doc.setFontStyle("bolditalic"); //there are 4 "fonts": normal, bold, italic and bolditalic. to not drop the other one, flags isbold and isitalic are used.
					TSettings.isitalic=true;
					// setTextStyle();
					j+=2;
					insideTag=false;
					setTextStyle();
					continue;
				}else if(zwitex[i].substr(j,4)=="</i>"){
					renderword(zwitex[i],j);
					// if(!isbold)
						// doc.setFontStyle("normal");
					// else
						// doc.setFontStyle("bold");
					TSettings.isitalic=false;		
					j+=3;
					insideTag=false;
				}else if(zwitex[i].substr(j,3)=="<b>"){		//<b>
					// if(!isitalic)
						// doc.setFontStyle("bold");
					// else
						// doc.setFontStyle("bolditalic");
					TSettings.isbold=true;
					j+=2;
					insideTag=false;
					continue;
				}else if(zwitex[i].substr(j,4)=="</b>"){
					renderword(zwitex[i],j);
					// if(!isitalic)
						// doc.setFontStyle("normal");
					// else
						// doc.setFontStyle("italic");
					TSettings.isbold=false;
					j+=3;
					insideTag=false;Frender=true;
				}else if(zwitex[i].substr(j,40)=="<span style=\"border-bottom: 1px solid;\">"){ 	//underline
					renderword(zwitex[i],j);
					styles.push("underline");
					TSettings.isunderlined=true;
					j+=39;
					insideTag=false;
				}else if(zwitex[i].substr(j,8)=="<strike>"){ 	//<strike>
					renderword(zwitex[i],j);
					TSettings.isstrike=true;
					j+=7;insideTag=false;
				}else if(zwitex[i].substr(j,9)=="</strike>"){ //line drawn where strike tag ends
					renderword(zwitex[i],j);
					TSettings.isstrike=false;
					j+=8;insideTag=false;
				}else if(!insideTag && zwitex[i][j]==" "){ //render text after each blank space. required for fluent linebreak (no word-break)
					renderword(zwitex[i],j);
				}else if(j==zwitex[i].length-1){ //also render 
					renderword(zwitex[i],j+1);
				}
				setTextStyle();
			}		
			verticalOffset+=TSettings.size*self_.lineHeight/72;
			if(verticalOffset+self_.margin>pageHeight && i<zwitex.length-1){
				newpage();
				// doc.text("test"+i+"/"+zwitex.length+"_"+zwitex[i]+"-"+zwitex[zwitex.length-1],0,verticalOffset);
			}
		}		


		progress(1,ind);
		// console.log("post",ind+1,posts.length);
		if(ind<posts.length-1){
			if(self_.postDivider){
				doc.setLineWidth(1/72); //2pt
				doc.setDrawColor(140,140,140);	
				doc.line(self_.margin,verticalOffset,self_.pageWidth-self_.margin,verticalOffset);
				verticalOffset+=TSettings.size/36;
			}
			setTimeout(function(){
					loadposts(ind+1,posts);
				});
			// return loadposts(ind+1,posts);
		}else{
			// doc.output('dataurlnewwindow');
			// doc.setTextColor(0,0,255);
			// size=20;
			// doc.setFontSize(size);
			// var LText="Text mit mehr Text?";
			// var Lwidth=doc.getStringUnitWidth(LText) * size/72;
			// doc.text(LText, self_.margin, verticalOffset);
			// doc.link(self_.margin, verticalOffset-size/72, -self_.margin/72 + self_.margin+Lwidth, size/36-pageHeight, {pageNumber:2, top:4});
			// // doc.textWithLink("Text mit mehr Text?", self_.margin, verticalOffset, {pageNumber:2, top:4});
			doc.save(self_.title+'.pdf');
		}
	}

	function asyncLoad(ind, callback){  //preloading images in cache to use them later by id and synchronous
		// console.log(ind, thumbs.eq(ind));
		var src=thumbs[ind].getAttribute("src").replace("thumb","src").replace("s.",".");
		var Timg=new Image();
		if(! thumbs[ind].className.toLowerCase().includes("thumb")){ //intelligent caching & mapping index to id
			var smallind=smallUrlList.indexOf(src);
			if(smallind!=-1){
				smallImgMap.push(smallind);
				if(ind==thumbs.length-1){
					// id=0;
					callback();
				}else{
					asyncLoad(ind+1,callback);
				}
				return
			}
		}
		Timg.onload=function(){ //wait for img to load
			var dataURI = getBase64Image(Timg);
			progress(0,ind);
			// console.log(this,self_);
			// console.log("img",ind+1,thumbs.length,img.src);
			if(thumbs[ind].className.toLowerCase().includes("thumb")){ //thumbs (one per post)
				ratsThumb[imgCounter[0]]=Timg.width/Timg.height;				
				// if(img.src.substr(-3).toLowerCase()=="png"){
					// doc.addImage(dataURI,"PNG", 0, 0, 1e-8, 0, ("thumb"+ imgCounter[0]++),self_.imgCompression);		
				// }else{
				// console.log(dataURI);
					doc.addImage(dataURI,"JPEG", 0, 0, 1e-8, 0, ("thumb"+ imgCounter[0]++),self_.imgCompression);		
				// }
			}else{				//icons, imageMap for reappearing icons to be only loaded once				
				ratsSmall[imgCounter[1]]=Timg.width/Timg.height;		
				smallUrlList.push(src);
				smallImgMap.push(imgCounter[1]);
				// if(img.src.substr(-3).toLowerCase()=="png"){
					// doc.addImage(dataURI,"PNG", 0, 0, 1e-8, 0, ("small"+ imgCounter[1]++),self_.imgCompression);		
				// }else{
					doc.addImage(dataURI,"JPEG", 0, 0, 1e-8, 0, ("small"+ imgCounter[1]++),self_.imgCompression);		
				// }
			}
			if(ind==thumbs.length-1){
				callback();
			}else{
				asyncLoad(ind+1,callback);
			}
		}; 
		// img.height = Math.round(thumbs.eq(ind).height()/thumbs.eq(ind).width() * self_.imgwidh*72);
		// img.width  = Math.round(self_.imgwidh*72);
		Timg.src=src;
	}	
	function progress(phase,index){
		// if(phase==0){
			self_.progressCallback(phase, index+1,thumbs.length,posts.length);
			// console.log(index+1 , thumbs.length, index+1, thumbs.length+posts.length);
		// }else{		
			// console.log(index+1 , posts.length, index+1+thumbs.length, thumbs.length+posts.length);
		// }
	}
	self_.convert=function(IncludePosts){
		
		doc.setProperties({
			"title": self_.title,
			"subject": 'Quest Conversion to PDF',		
			"author": 'tgchan',
			"keywords": 'generated, javascript, dediggefedde, tgchan, tgchan_BLICK, '+self_.title,
			"creator": 'tgchan_BLICK '
		});

		// var IncludePosts=$("#delform, td.reply, td.highlight").filter(function(){if($(this).find("img.thumb").length>0)return true;else return false;});
		posts=IncludePosts; //in case jquery is not used to get elements.
		thumbs=[];
		var val=null;
		for(var i=0,n=posts.length;i<n;++i){
			val=posts[i].querySelectorAll("img.thumb, blockquote img");
			// for(var j=0,nj=val.length;j<nj;++j)
				// thumbs.push(posts[i].parentNode.querySelector("#delform img.thumb"));
				
			if(val!==null)thumbs=thumbs.concat(Array.prototype.slice.call(val));
			if(posts[i].id=="delform")
				thumbs.push(posts[i].parentNode.querySelector("#delform img.thumb"));
		}
		console.log(thumbs);
		// console.log(posts.length);
		asyncLoad(0,function(){
			setTimeout(function(){
				loadposts(0);
			});
		});	
	}
}

// var testpdf=new tgchan2PDF();
// testpdf.title=$("#delform span.filetitle").first().text().replace(/\r|\n/,"");
// testpdf.convert($("#delform, td.reply, td.highlight").filter(function(){if($(this).find("img.thumb").length>0)return true;else return false;}));