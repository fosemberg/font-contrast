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

const brt_slider    = doc.querySelector('#brt-slider');
const brt_label     = doc.querySelector('#brt-label');

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
	if(isURLshown) return;

	urlSpan.style.opacity = 0;
	urlSpan.style.cursor = "context-menu";
  
	refreshBtn.style.opacity = 1;
	refreshBtn.style.cursor = "pointer";
  
	refreshBtn.onclick = () => browser.tabs.reload();

	isURLshown = true;
}

let callback = tabs => 
{
	let url = tabs[0].url;

	let domain = extractRootDomain(String(url));

	if(url.startsWith("http")) urlSpan.innerText = domain;
	else showRefreshBtn();

	const init = i =>
	{
		// i === global options item

		strSlider.value          = i.globalStr;
		strLabel.innerText       = i.globalStr;
		sizeSlider.value         = i.size;
		sizeLabel.innerText      = i.size;
		thresholdSlider.value    = i.sizeThreshold;
		thresholdLabel.innerText = i.sizeThreshold;
		brt_slider.value         = i.brightness;
		brt_label.innerText      = i.brightness;

		strSlider.oninput 	= () => strLabel.innerText 	 = strSlider.value;
		sizeSlider.oninput 	= () => sizeLabel.innerText 	 = sizeSlider.value;
		thresholdSlider.oninput = () => thresholdLabel.innerText = thresholdSlider.value;
		brt_slider.oninput 	= () => brt_label.innerText 	 = brt_slider.value;

		skipHeadings.checked 	= i.skipHeadings;
		skipColoreds.checked 	= i.skipColoreds;
		advDimming.checked 	= i.advDimming;
		boldText.checked 	= i.boldText;
		forcePlhdr.checked 	= i.forcePlhdr;
		forceOpacity.checked 	= i.forceOpacity;
		skipWhites.checked 	= i.skipWhites;
		underlineLinks.checked 	= i.underlineLinks;

		let whitelist = i.whitelist || [];
		let blacklist = i.blacklist || [];

		if (blacklist.findIndex(o => o.url === domain) > -1)
		{
			BLcheck.checked = true;
		}
		else 
		{
			const idx = whitelist.findIndex(o => o.url === domain);
		
			if(idx > -1)
			{
				const item = whitelist[idx];

				strSlider.value 		= item.strength;
				strLabel.innerText 		= item.strength;
				sizeSlider.value 		= item.size;
				sizeLabel.innerText 		= item.size;
				thresholdSlider.value 		= item.threshold;
				thresholdLabel.innerText 	= item.threshold;
				brt_slider.value 		= item.brightness || i.brightness;
				brt_label.innerText 		= item.brightness || i.brightness;

				skipHeadings.checked 		= item.skipHeadings;
				skipColoreds.checked 		= item.skipColoreds;
				advDimming.checked 		= item.advDimming;
				outline.checked 		= item.outline;
				boldText.checked 		= item.boldText;
				forcePlhdr.checked 		= item.forcePlhdr;
				forceOpacity.checked 		= item.forceOpacity;
				skipWhites.checked 		= item.skipWhites;
				underlineLinks.checked 		= item.underlineLinks;

				WLcheck.checked = true;
				BLcheck.checked = false;
			}
		}
		
		if(!advDimming.checked)
		{
			document.querySelector('#brt-div').style.display ='none';
		}

		let wl_item = {
			url: 		domain, 
			strength: 	i.globalStr,
			size: 		i.size,
			threshold: 	i.sizeThreshold,

			skipHeadings: 	i.skipHeadings, 
			skipColoreds: 	i.skipColoreds, 
			advDimming: 	i.advDimming,
			boldText: 	i.boldText,
			forcePlhdr: 	i.forcePlhdr,
			forceOpacity: 	i.forceOpacity,
			skipWhites: 	i.skipWhites,
			underlineLinks: i.underlineLinks,
			outline: 	false // The outline cannot be set globally for now
		};

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
				else 		list.push(item);

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

		document.querySelectorAll('.option').forEach(check =>
		{
			check.onclick = () => 
			{
				wl_item.strength 	= strSlider.value;
				wl_item.size 		= sizeSlider.value;
				wl_item.threshold 	= thresholdSlider.value;
				wl_item.brightness 	= brt_slider.value;
				wl_item.skipColoreds 	= skipColoreds.checked;
				wl_item.skipHeadings 	= skipHeadings.checked;
				wl_item.advDimming 	= advDimming.checked;
				wl_item.outline 	= outline.checked;
				wl_item.boldText 	= boldText.checked;
				wl_item.forcePlhdr 	= forcePlhdr.checked;
				wl_item.forceOpacity 	= forceOpacity.checked;
				wl_item.skipWhites 	= skipWhites.checked;
				wl_item.underlineLinks 	= underlineLinks.checked;
				
				if(check.id == 'adv-mode')
				{
					const brt_div = document.querySelector('#brt-div');
					
					if(advDimming.checked)
					{
						brt_div.style.display = 'flex';
					}
					else
					{
						brt_div.style.display = 'none';
					}
				}
				
				whitelist = updateList(wl_item, true, true);

				if(BLcheck.checked) 
				{
					blacklist = updateList({url: domain}, false, false);
				}
			}
		});
	};
	
	const stored = [
		"whitelist", 
		"blacklist", 
		"globalStr",
		"size",
		"sizeThreshold", 
		"skipColoreds", 
		"skipHeadings", 
		"advDimming",
		"brightness", 
		"boldText", 
		"forcePlhdr",
		"forceOpacity",
		"skipWhites",
		"underlineLinks"
	];

	storage.get(stored, init);
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