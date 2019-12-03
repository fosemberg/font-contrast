/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

const storage = chrome.storage.local;
const doc = document;

let strSlider       = doc.querySelector("#strSlider");
let strLabel        = doc.querySelector("#strLabel");

let sizeSlider      = doc.querySelector("#sizeSlider");
let sizeLabel       = doc.querySelector("#sizeLabel");

let thresholdSlider = doc.querySelector("#thresholdSlider");
let thresholdLabel  = doc.querySelector("#thresholdLabel");

let urlSpan         = doc.querySelector("#url");

let WLcheck         = doc.querySelector("#addWL");
let BLcheck         = doc.querySelector("#addBL");

let skipColoreds    = doc.querySelector("#skipColoreds");
let skipHeadings    = doc.querySelector("#skipHeadings");
let advDimming      = doc.querySelector("#advDimming");
let outline         = doc.querySelector("#outline");
let boldText        = doc.querySelector("#boldText");
let forcePlhdr      = doc.querySelector("#forcePlhdr");
let skipWhites      = doc.querySelector("#skipWhites");

let optionsBtn      = doc.querySelector("#optionsBtn");
let refreshBtn      = doc.querySelector("#refreshBtn");

let isURLshown = false;

function showRefreshBtn()
{
	if(!isURLshown)
	{
		urlSpan.style.opacity = 0;
		urlSpan.style.cursor = "context-menu";
	  
		refreshBtn.style.opacity = 1;
		refreshBtn.style.cursor = "pointer";
	  
		refreshBtn.onclick = () => browser.tabs.reload();

		isURLshown = true;
	}
}

let callback = (tabs) => 
{
	let url = tabs[0].url;

	let domain = extractRootDomain(String(url));

	if(url.startsWith("http")) urlSpan.innerText = domain;
	else showRefreshBtn();

	let stored = [
		"whitelist", 
		"blacklist", 
		"globalStr",
		"size",
		"sizeThreshold", 
		"skipColoreds", 
		"skipHeadings", 
		"advDimming", 
		"boldText", 
		"forcePlhdr",
		"forceOpacity",
		"skipWhites",
		"underlineLinks"
	];

	const process = (i) =>
	{
		let whitelist = i.whitelist || [];
		let blacklist = i.blacklist || [];

		const updateList = (item, is_wl, add) =>
		{
			let list, list_str;
			let check;
			
			if(is_wl) 
			{
				list = whitelist;
				list_str = 'whitelist';
				check = WLcheck;
			}
			else
			{
				list = blacklist;
				list_str = 'blacklist';
				check = BLcheck;
			}

			let idx = list.findIndex(o => o.url === item.url);
			
			if(add)
			{
				if(idx > -1) 	list[idx] = item;
				else 			list.push(item);

				check.checked = true;
			}
			else if(idx > -1) 
			{
				list.splice(idx, 1);
				
				check.checked = false;
			}

			storage.set({[list_str]: list});

			showRefreshBtn();

			return list;
		};

		let globalChecks = [
			i.skipHeadings,
			i.skipColoreds, 
			i.advDimming, 
			i.boldText, 
			i.forcePlhdr,
			i.forceOpacity,
			i.skipWhites,
			i.underlineLinks
		];

		strSlider.value 		= i.globalStr;
		strLabel.innerText 		= i.globalStr;
		sizeSlider.value 		= i.size;
		sizeLabel.innerText 	= i.size;
		thresholdSlider.value 	= i.sizeThreshold;
		thresholdLabel.innerText= i.sizeThreshold;

		strSlider.oninput 		= () => strLabel.innerText = strSlider.value;
		sizeSlider.oninput 		= () => sizeLabel.innerText = sizeSlider.value;
		thresholdSlider.oninput = () => thresholdLabel.innerText = thresholdSlider.value;

		skipHeadings.checked 	= globalChecks[0];
		skipColoreds.checked 	= globalChecks[1];
		advDimming.checked 		= globalChecks[2];
		boldText.checked 		= globalChecks[3];
		forcePlhdr.checked 		= globalChecks[4];
		forceOpacity.checked 	= globalChecks[5];
		skipWhites.checked 		= globalChecks[6];
		underlineLinks.checked 	= globalChecks[7];

		if (blacklist.findIndex(o => o.url === domain) > -1)
		{
			BLcheck.checked = true;
		}
		else 
		{
			const idx = whitelist.findIndex(o => o.url === domain);
		
			if(idx > -1)
			{
				const i = whitelist[idx];

				strSlider.value 			= i.strength;
				strLabel.innerText 			= i.strength;
				sizeSlider.value 			= i.size || i.size;
				sizeLabel.innerText 		= i.size || i.size;
				thresholdSlider.value 		= i.threshold || i.sizeThreshold;
				thresholdLabel.innerText 	= i.threshold || i.sizeThreshold;

				skipHeadings.checked 		= i.skipHeadings;
				skipColoreds.checked 		= i.skipColoreds;
				advDimming.checked 			= i.advDimming;
				outline.checked 			= i.outline;
				boldText.checked 			= i.boldText;
				forcePlhdr.checked 			= i.forcePlhdr;
				forceOpacity.checked 		= i.forceOpacity;
				skipWhites.checked 			= i.skipWhites;
				underlineLinks.checked 		= i.underlineLinks;

				WLcheck.checked = true;
				BLcheck.checked = false;
			}       
		}

		let wl_item = {
			url: 			domain, 
			strength: 		i.globalStr,
			size: 			i.size,
			threshold: 		i.sizeThreshold,

			skipHeadings: 	globalChecks[0], 
			skipColoreds: 	globalChecks[1], 
			advDimming: 	globalChecks[2],
			boldText: 		globalChecks[3],
			forcePlhdr: 	globalChecks[4],
			forceOpacity: 	globalChecks[5],
			skipWhites: 	globalChecks[6],
			underlineLinks: globalChecks[7],
			outline: 		false // The outline cannot be set globally for now
		};

		WLcheck.onclick = () => 
		{
			const is_checked = WLcheck.checked;

			whitelist = updateList(wl_item, true, is_checked);

			if(is_checked)
			{ 
				let idx = blacklist.findIndex(o => o.url === domain);
				
				if(idx > -1) 
				{
					blacklist = updateList({url: domain}, false, false);
				}
			}
		};

		BLcheck.onclick = () => 
		{
			const is_checked = BLcheck.checked;

			blacklist = updateList({url: domain}, false, is_checked);

			if(is_checked)
			{ 
				const idx = whitelist.findIndex(o => o.url === domain);

				if(idx > -1)
				{
					whitelist = updateList(wl_item, true, false);
				}
			}
		};

		document.querySelectorAll('.option').forEach((check) =>
		{
			check.onclick = () => 
			{
				wl_item.strength 		= strSlider.value;
				wl_item.size 			= sizeSlider.value;
				wl_item.threshold 		= thresholdSlider.value;
				wl_item.skipColoreds 	= skipColoreds.checked;
				wl_item.skipHeadings 	= skipHeadings.checked;
				wl_item.advDimming 		= advDimming.checked;
				wl_item.outline 		= outline.checked;
				wl_item.boldText 		= boldText.checked;
				wl_item.forcePlhdr 		= forcePlhdr.checked;
				wl_item.forceOpacity 	= forceOpacity.checked;
				wl_item.skipWhites 		= skipWhites.checked;
				wl_item.underlineLinks 	= underlineLinks.checked;
				
				whitelist = updateList(wl_item, true, true);

				if(BLcheck.checked) 
				{
					blacklist = updateList({url: domain}, false, false);
				}
			}
		});
	}

	storage.get(stored, process);
};

optionsBtn.onclick = () => 
{
	if (chrome.runtime.openOptionsPage) 
	{
		chrome.runtime.openOptionsPage();
	} 
	else 
	{
		window.open(chrome.runtime.getURL('options.html'));
	}
};

chrome.tabs.query({active:true, currentWindow:true}, callback);

function extractHostname(url) 
{
	let hostname;

	if (url.indexOf("://") > -1) 
	{
		hostname = url.split('/')[2];
	}
	else 
	{
		hostname = url.split('/')[0];
	}

	hostname = hostname.split(':')[0];
	hostname = hostname.split('?')[0];
	hostname = hostname.replace('www.', '');

	return hostname;
}

function extractRootDomain(url) 
{
	let domain = extractHostname(url);
	let splitArr = domain.split('.');
	let len = splitArr.length;

	// Extract the root domain if there's a subdomain
	if (len > 2) 
	{
		domain = splitArr[len- 2] + '.' + splitArr[len - 1];
		
		// Check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
		if (splitArr[len- 1].length === 2 && splitArr[len - 1].length === 2) 
		{
			domain = splitArr[len - 3] + '.' + domain;
		}
	}
	
	return domain;
}