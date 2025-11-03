// ==UserScript==
// @name         dA_archive_notes
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  archive the notes
// @author       Dediggefedde
// @match        http://*.deviantart.com/notifications/notes/*
// @match        https://*.deviantart.com/notifications/notes/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=deviantart.com
// @resource	viewer	https://phi.pf-control.de/userscripts/dA_archive_notes/Viewer.html
// @resource	starter	https://phi.pf-control.de/userscripts/dA_archive_notes/chrome_starter.bat
// @grant        GM.addStyle
// @grant        GM_getResourceText
// ==/UserScript==
//
/* global DiFi*/
/* global tiny_zip*/
// @ts-check
//
//
/* jshint esnext:true */
/* eslint curly: 0 */
//
//
//
(function () {
	'use strict';
	let viewer = GM_getResourceText("viewer");
	let starter = GM_getResourceText("starter");
	let debugLog = false;
	//
	GM.addStyle(`
#dA_AN_Menu{display:none;position: absolute;top: 0;left: 0;width: 200px;height: 170px;background: lightblue;border-radius: 15px;border: 2px ridge black;padding: 10px;box-shadow: -2px -2px 5px #0df inset;}
#dA_AN_Menu input[type=number]{line-height:1em;width:50px;}
#dA_AN_btnArchive{transform: translateX(-55%);left: 50%;position: relative;}
#dA_AN_Menu button{cursor:pointer;}
#dA_AN_Menu>*{margin:5px;}
#dA_AN_selectFolder{width:95%;}
#dA_AN_btnX{position:absolute;top:5px;right:5px;}
`);
	//
	/**
	 * Will download a file without user confirmation!
	 * Target is download-folder
	 * @param {*} content file content, here zip-file in Blob format
	 * @param {*} mimeType type of file, here octec-stream
	 * @param {*} filename file-name file is downloaded as
	 */
	function download(content, mimeType, filename) {
			const a = document.createElement('a'); // Create "a" element
			const blob = new Blob([content], { type: mimeType }); // Create a blob (file-like object)
			const url = URL.createObjectURL(blob); // Create an object URL from blob
			a.setAttribute('href', url); // Set "a" element link
			a.setAttribute('download', filename); // Set download filename
			a.click(); // Start downloading
	}
	let noteIds = {}; //list of note-ids with information to fetch, id=>{folder,sender,date,subject}
	let noteMSGs = {}; //list of note contents fetched. id=>text
	let pending = {}; //pages/notes still pending. Note: first all pages are scanned through, then all notes
	let hiddenDom = document.createElement("div"); //parsing element to fetch note-information in noteIds
	let folderNames = {}; //dictionary for folder names
	let maxPrg = 1;
	//
	/** Interface to ensure noteIds structure */
	function addNoteId(id, folder, sender, date, subject) {
			noteIds[`${folder}_${id}`] = { id, folder, sender, date, subject };
	}
	//
	/** Interface to ensure noteMSGs structure */
	function addMsg(id, text) {
			noteMSGs[id] = text;
	}
	//
	/** request first page of folder to fetch max-page from botton.
	 * returns promise, resolve [folder,max page], reject error or data.response if server error
	 */
	function fetchMaxPage(folder) {
			return new Promise((resolve, reject) => {
					try {
							DiFi.pushPost('Notes', 'display_folder', [folder, 0, false], (success, data) => {
									try {
											if (debugLog)
													console.log("dA_archive_notes fetchMaxPage ", folder, data.response);
											if (data.response.status != "SUCCESS") {
													return reject(data.response);
											}
											hiddenDom.innerHTML = data.response.content?.body ?? "";
											let pgs = hiddenDom.querySelectorAll("li.number a.away");
											if (pgs.length < 2)
													resolve([folder, 1]);
											else
													resolve([folder, parseInt(pgs[1].innerText)]);
									}
									catch (ex) {
											console.log("dA_archive_notes error in pushPost fetchMaxPage", ex, folder);
											reject(ex);
									}
							});
							DiFi.send();
					}
					catch (ex) {
							reject(ex);
							console.log("dA_archive_notes error in fetchMaxPage", ex, folder);
					}
			});
	}
	//
	/**
	 * fetches note IDs to fetch content later for.
	 * @param {string|number} folder "1" inbox, "0" draft, some named (unread), see list properties a["data-component"] or url ending #folder_offset
	 */
	function fetchIDs(folder, startPage, stopPage) {
			return new Promise((resolve, reject) => {
					try {
							pending[folder] = 0;
							let chunksize = 10;
							for (let ch = 0; ch < Math.ceil((stopPage - startPage + 1) / chunksize); ++ch) {
									for (let page = startPage + ch * chunksize; page < (startPage + (ch + 1) * chunksize) && (page <= stopPage); ++page) {
											++pending[folder];
											DiFi.pushPost('Notes', 'display_folder', [folder, (page - 1) * 10, false], function (success, data) {
													if (debugLog)
															console.log("dA_archive_notes fetchIDs ", folder, page, data.response);
													let id, name, date, subject;
													if (data.response.status != "SUCCESS") {
															console.log("dA_archive_notes error in fetchIDs", folder, page, data);
															//but proceed
													}
													else {
															hiddenDom.innerHTML = data.response.content.body;
															Array.from(hiddenDom.querySelectorAll("li[data-noteid]")).forEach(el => {
																	id = el.getAttribute("data-noteid") ?? "0";
																	name = el.querySelector("span.sender")?.innerText.trim() ?? "0";
																	date = el.querySelector("span.ts")?.innerText.trim() ?? "0";
																	subject = el.querySelector("span.subject")?.innerText.trim() ?? "0";
																	addNoteId(id, folder, name, date, subject);
															});
													}
													if (--pending[folder] == 0) {
															resolve();
													}
													showProgress();
											});
									}
									DiFi.send();
							}
					}
					catch (ex) {
							console.log("dA_archive_notes error in fetchIDs", ex);
							reject(ex);
					}
			});
	}
	//
	/**
	 * Fetches all Notes in noteIds and fills noteMSGs
	 * updates pending = remaining notes
	 * @returns Promise resolved when all notes fetched, rejected if one request failed or error occured
	 */
	function fetchNote() {
			return new Promise((resolve, reject) => {
					try {
							pending["__notes"] = 0;
							//
							const chunkSize = 10;
							for (let i = 0; i < Object.entries(noteIds).length; i += chunkSize) {
									const chunk = Object.entries(noteIds).slice(i, i + chunkSize);
									chunk.forEach(([id, note]) => {
											++pending["__notes"];
											DiFi.pushPost('Notes', 'display_note', [note.folder, note.id], function (success, data) {
													if (debugLog)
															console.log("dA_archive_notes fetchNote ", note.folder, note.id, data.response);
													if (data.response.status != "SUCCESS") {
															console.log("dA_archive_notes error in fetchNote", id, note, data);
															return reject(data.response);
													}
													addMsg(id, data.response.content.body);
													//
													if (--pending["__notes"] == 0) {
															resolve();
													}
													showProgress();
											});
									});
									DiFi.send();
							}
					}
					catch (ex) {
							console.log("dA_archive_notes error in fetchNote", ex);
							reject(ex);
					}
			});
	}
	//
	/**
	 * 1. makes a request in folder for each page in range to get list of notes
	 * 2. makes a bundled request for each note to get the content
	 * 3. calls zipResonse to create summary file and zip result for download
	 * @param {string} folder folder-ID
	 * @param {number} pageStart page to start downloading on
	 * @param {number} pageStop page to stop doanloding on
	 */
	function downloadFolder(folder, pageStart, pageStop) {
			noteIds = {};
			noteMSGs = {};
			pending = {};
			maxPrg = 1;
			if (folder != "0") {
					maxPrg = pageStop - pageStart + 1;
					showProgress();
					if (debugLog)
							console.log("folder", folder, pageStart, pageStop);
					fetchIDs(folder, pageStart, pageStop).then((ret) => {
							maxPrg = Object.keys(noteIds).length;
							return fetchNote();
					}).then((ret) => {
							zipResponse();
					}).catch(err => {
							if (debugLog)
									console.log("dA_archive_notes error2", err);
							alert("Error downloading archive:\n" + err);
					});
			}
			else { //ALL folders
					Promise.all(Object.keys(folderNames).map(fol => {
							return fetchMaxPage(fol);
					})).then((ret) => {
							maxPrg = 0;
							ret.forEach(([fol, maxP]) => { maxPrg += maxP; });
							if (debugLog)
									console.log("all", ret);
							return Promise.all(ret.map(([fol, maxP]) => { return fetchIDs(fol, 1, maxP); }));
					}).then((ret) => {
							maxPrg = Object.keys(noteIds).length;
							return fetchNote();
					}).then((ret) => {
							zipResponse();
					}).catch(err => {
							console.log("dA_archive_notes error3", err);
							alert("Error downloading archive:\n" + err);
					});
			}
	}
	//
	function showProgress() {
			let sum = 0;
			if (!Number.isInteger(maxPrg) || maxPrg == 0)
					maxPrg = 1;
			Object.values(pending).forEach(pen => {
					sum += pen;
			});
			let pr = Math.round((maxPrg - sum) / maxPrg * 100);
			if (pr < 1)
					pr = 1;
			if (pr > 100)
					pr = 100;
			setTimeout(() => {
					let prEl = document.getElementById("dA_AN_progress");
					if (prEl !== null)
							prEl.value = pr;
			}, 500);
			//
	}
	//
	function getNoteFileName(id) {
			if (id === "") {
					console.log("dA_archive_notes error: empty note id");
					return "";
			}
			let note = noteIds[id];
			if (!note) {
					console.log("dA_archive_notes error: wrong note id", id);
					return id;
			}
			return `${folderNames[note.folder]}_${note.id}_${note.sender}_${note.date}.html`;
	}
	/**
	 * Creates summary file for noteIds, puts noteMSGs into html files, puts all into zip file, triggers download
	 */
	function zipResponse() {
			let zip = new tiny_zip();
			//
			let contenttext = "ID\tFolder\tSender\tDate\tSubject\tFile\n";
			contenttext += Object.entries(noteIds).map(([id, note]) => {
					return `${note.id}\t${folderNames[note.folder]}\t` +
							`${note.sender}\t${note.date}\t${note.subject}\t` +
							`${getNoteFileName(id)}`;
			}).join("\n");
			zip.add("content.tsv", tiny_zip.uint8array_from_binstr(contenttext));
			//
			Object.entries(noteMSGs).forEach(([id, note]) => {
					zip.add(getNoteFileName(id), tiny_zip.uint8array_from_binstr(note));
			});
			//
			const replacements = { "-": "-", "T": "_", "Z": "", ":": "-", ".": "-" };
			const dt = (new Date()).toISOString().replace(/\D/gi, (el) => replacements[el] || "").slice(0, -5);
			//
			zip.add("_Viewer.html", tiny_zip.uint8array_from_binstr(viewer));
			zip.add("_chrome_starter.bat", tiny_zip.uint8array_from_binstr(starter));
			//
			download(zip.generate(), "application/octet-stream", `dA_archive_notes_${dt}.zip`);
	}
	//
	/** injects GUI and attaches event handlers */
	function fillGUI() {
			let pgs = document.querySelectorAll("li.number a.away");
			let finalP = pgs[1].innerText;
			//
			let bar = document.createElement("div");
			bar.id = "dA_AN_Menu";
			//
			let domH3 = document.createElement("h3");
			domH3.innerHTML = "Export Notes";
			bar.appendChild(domH3);
			//
			let selFolder = document.createElement("select");
			selFolder.id = "dA_AN_selectFolder";
			let fragment = new DocumentFragment();
			let opt = document.createElement('option');
			opt.value = "0";
			opt.innerHTML = "All Folders";
			fragment.appendChild(opt);
			Array.from(document.querySelectorAll("a.folder-link[data-folderid]")).forEach(el => {
					let folder = el.getAttribute("data-folderid");
					if (folder === null) {
							console.log("dA_archive_notes error: wrong data-folderid", el);
							return;
					}
					opt = document.createElement('option');
					opt.value = folder;
					opt.innerHTML = el.getAttribute("title") ?? "?";
					fragment.appendChild(opt);
					folderNames[folder] = el.getAttribute("title") ?? "?";
			});
			selFolder.appendChild(fragment);
			bar.append(selFolder);
			//
			bar.appendChild(document.createElement("br"));
			//
			let domElLab = document.createElement("label");
			domElLab.htmlFor = "dA_AN_minP";
			domElLab.innerHTML = "Pages:";
			bar.appendChild(domElLab);
			//
			let domInpNumMin = document.createElement("input");
			domInpNumMin.type = "number";
			domInpNumMin.id = "dA_AN_minP";
			domInpNumMin.min = "1";
			domInpNumMin.max = "1";
			domInpNumMin.value = "1";
			bar.appendChild(domInpNumMin);
			//
			let domInpNumMax = document.createElement("input");
			domInpNumMax.type = "number";
			domInpNumMax.id = "dA_AN_maxP";
			domInpNumMax.min = "1";
			domInpNumMax.max = "1";
			domInpNumMax.value = "1";
			bar.appendChild(domInpNumMax);
			//
			bar.appendChild(document.createElement("br"));
			//
			let domPr = document.createElement("progress");
			domPr.id = "dA_AN_progress";
			domPr.value = 0;
			domPr.max = 100;
			bar.appendChild(domPr);
			//
			let btn = document.createElement("button");
			btn.innerHTML = "Archive";
			btn.id = "dA_AN_btnArchive";
			btn.addEventListener("click", (ev) => {
					let minP = document.getElementById("dA_AN_minP")?.value ?? 1;
					let maxP = document.getElementById("dA_AN_maxP")?.value ?? 1;
					let folder = document.getElementById("dA_AN_selectFolder")?.value ?? 0;
					downloadFolder(folder, parseInt(minP), parseInt(maxP));
			}, false);
			bar.append(btn);
			//
			btn = document.createElement("button");
			btn.innerHTML = "X";
			btn.id = "dA_AN_btnX";
			btn.addEventListener("click", (ev) => {
					bar.style.display = ""; //default none
			}, false);
			bar.append(btn);
			//
			let showBut = document.createElement("a");
			showBut.innerHTML = "Archive";
			showBut.id = "dA_AN_aShowDialog";
			showBut.addEventListener("click", (ev) => {
					bar.style.display = "block"; //default none
			}, false);
			//
			bar.addEventListener("change", (ev) => {
					ev.stopPropagation();
					let minEl = document.getElementById("dA_AN_minP");
					let maxEl = document.getElementById("dA_AN_maxP");
					let target = ev.target;
					if (minEl === null || maxEl === null || target === null)
							return;
					let maxLim = parseInt(maxEl.max);
					let minLim = parseInt(maxEl.min);
					let curVal = parseInt(target.value);
					if (target.min && curVal < minLim)
							target.value = String(minLim);
					if (target.max && curVal > maxLim)
							target.value = String(maxLim);
					//
					if (target.id == "dA_AN_minP" && curVal > parseInt(maxEl.value))
							maxEl.value = minEl.value;
					if (target.id == "dA_AN_maxP" && curVal < parseInt(minEl.value)) {
							ev.preventDefault();
							minEl.value = maxEl.value;
							return false;
					}
					if (target.id == "dA_AN_selectFolder") {
							fetchMaxPage(target.value).then(([folder, maxP]) => {
									minEl.max = String(maxP);
									maxEl.max = String(maxP);
									maxEl.value = String(maxP);
									minEl.value = "1";
							}).catch(err => {
									console.log("dA_archive_notes error1", err);
							});
					}
			}, true);
			//
			let ank = document.querySelector("div.note-controls.note-actions");
			if (ank !== null) {
					ank.append(showBut);
					ank.append(bar);
			}
	}
	//
	/** Initial entry, called every second for javascript navigation, injects GUI */
	function init() {
			if (document.getElementById("dA_AN_Menu") != null)
					return; //already present
			let pgs = document.querySelectorAll("li.number a.away");
			if (pgs.length < 2)
					return; //Page not yet loaded
			fillGUI();
	}
	//
	//javascript navigation workaround
	setInterval(init, 1000);
	//
	//
	//ressource for creating zip:
	/*
	Copyright (C) 2013 https://github.com/vuplea
	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
	*/
	// edit note: update by dediggefedde at 2024-10-17 into class form
	//
	class tiny_zip {
			//
			constructor() {
					this.localHs = [];
					this.contents = [];
					this.centralHs = [];
					this.local_offset = 0;
					this.central_offset = 0;
			}
			//
			static uint8array_from_binstr(string) {
					const binary = new Uint8Array(string.length);
					for (let i = 0; i < string.length; i++) {
							binary[i] = string.charCodeAt(i);
					}
					return binary;
			}
			//
			utf8array_from_str(string) {
					const encoder = new TextEncoder();
					return encoder.encode(string);
					// return uint8array_from_binstr(unescape(encodeURIComponent(string)));
			}
			;
			//
			add(nameStr, content) {
					const name = this.utf8array_from_str(nameStr.replace(/[\/\:*?"<>\\|]/g, "_").slice(0, 255));
					const nlen = name.length;
					const clen = content.length;
					const crc = this.crc32(content);
					const localH = new Uint8Array(30 + nlen);
					localH.set([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, crc, crc >> 8,
							crc >> 16, crc >> 24, clen, clen >> 8, clen >> 16, clen >> 24, clen, clen >> 8, clen >> 16, clen >> 24,
							nlen, nlen >> 8, 0x00, 0x00
					]);
					localH.set(name, 30);
					//
					const centralH = new Uint8Array(46 + nlen);
					const loff = this.local_offset;
					centralH.set([0x50, 0x4b, 0x01, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
							crc, crc >> 8, crc >> 16, crc >> 24, clen, clen >> 8, clen >> 16, clen >> 24, clen, clen >> 8, clen >> 16,
							clen >> 24, nlen, nlen >> 8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, loff,
							loff >> 8, loff >> 16, loff >> 24
					]);
					centralH.set(name, 46);
					this.central_offset += centralH.length;
					//
					this.local_offset += localH.length + content.length;
					this.localHs.push(localH);
					this.contents.push(content);
					this.centralHs.push(centralH);
			}
			;
			//
			generate() {
					const n = this.localHs.length;
					//
					const endof = new Uint8Array(22);
					const loff = this.local_offset;
					const coff = this.central_offset;
					endof.set([0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, n, n >> 8, n, n >> 8, coff, coff >> 8, coff >> 16,
							coff >> 24, loff, loff >> 8, loff >> 16, loff >> 24, 0x00, 0x00
					]);
					//
					const outQueue = [];
					for (let i = 0; i < n; ++i) {
							outQueue.push(this.localHs[i]);
							outQueue.push(this.contents[i]);
					}
					for (let i = 0; i < n; ++i)
							outQueue.push(this.centralHs[i]);
					outQueue.push(endof);
					//
					return new Blob(outQueue, { type: "data:application/zip" });
			}
			;
			//
			crcTable() {
					var Table = [];
					for (var i = 0; i < 256; ++i) {
							var crc = i;
							for (var j = 0; j < 8; ++j)
									crc = -(crc & 1) & 0xEDB88320 ^ (crc >>> 1);
							Table[i] = crc;
					}
					return Table;
			}
			;
			crc32(data) {
					const crcTable = this.crcTable();
					var crc = -1;
					for (var i = 0; i < data.length; ++i)
							crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
					return ~crc;
			}
			;
	}
})();
//# sourceMappingURL=dA_archive_notes.user.js.map