/**
/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

"use strict";
var x, t;

function getRGBarr(rgb_str)
{
	// Returns RGB or RGBA array
	return rgb_str.match(/\d\.\d|\d+/g).map(Number);
}

function calcBrightness([r, g, b, a = 1])
{
	// Probably naive but provides okay results
	return +(r * 0.2126 + g * 0.7152 + b * 0.0722).toFixed(1);
}

function calcColorfulness([r, g, b, a = 1]) 
{
	// Literally no clue what I'm doing here
	return Math.abs(r-g) + Math.abs(g-b);
}

function containsText(node) 
{
	const children = Array.from(node.childNodes);

	return children.some(child => 
	{
		return child.nodeType === Node.TEXT_NODE && /\S/.test(child.nodeValue);
	});
}

function start(items) 
{
	let {
		whitelist, 
		globalStr: strength,
		brightness,
		size, 
		sizeThreshold, 
		skipHeadings, 
		skipColoreds: avoidReadable, 
		advDimming, 
		outline, 
		boldText, 
		forcePlhdr, 
		forceOpacity, 
		smoothEnabled,
		skipWhites,
		underlineLinks
	} = items;

	const url = extractRootDomain(String(window.location));

	if(whitelist) 
	{
		const idx = whitelist.findIndex(o => o.url === url);

		if(idx > -1) 
		{
			const i = whitelist[idx];

			strength        = i.strength;
			size            = i.size;
			sizeThreshold   = i.threshold;
			skipHeadings    = i.skipHeadings;
			avoidReadable   = i.skipColoreds; 
			advDimming      = i.advDimming;
			brightness	= i.brightness;
			outline         = i.outline;
			boldText        = i.boldText;
			forcePlhdr      = i.forcePlhdr;
			forceOpacity    = i.forceOpacity;
			skipWhites      = i.skipWhites;
			underlineLinks  = i.underlineLinks;
		}
	}

	if(smoothEnabled)
	{
		const doc = document;
		let y = doc.createElement("style");
		doc.head.appendChild(y);
		y.setAttribute("id", "_fct_");

		let smoothSize;
		size > 0 ? smoothSize = " font-size" : "";

		let z = doc.createTextNode(`[d__],[d__][style*]{
			transition: color,${smoothSize} .25s linear!important;
		}`);

		y.appendChild(z);
	}

	let nodes = nlToArr(document.body.getElementsByTagName('*'));

	let tagsToSkip = ["SCRIPT", "LINK", "STYLE", "IMG", "VIDEO", "SOURCE", "CANVAS"];
	let colorsToSkip = ["rgb(0, 0, 0)", "rgba(0, 0, 0, 0)"];
	const transparent = colorsToSkip[1];

	let procImg = true;

	const applyExceptions = (nodes) => 
	{
		switch(url)
		{
			case "youtube.com": {
				// Filters youtube player. It doesn't get dimmed anyways, 
				// but it's to make sure it stays untouched by the one offset I have for now.
				nodes = nodes.filter(node => { return !String(node.className).startsWith("ytp") });
				procImg = false;
				break;
			}
			case "facebook.com": {
				skipWhites = true;
				procImg = false;
				break;
			}
		}
	
		return nodes;
	};

	const getBackgroundBrightness = (parent, bgColor) =>
	{
		let bgLuma = 236; //assume light-ish color if we can't find it

		while (bgColor === transparent && parent)
		{
			if(parent instanceof Element) 
			{
				bgColor = getComputedStyle(parent).getPropertyValue("background-color");
			}

			parent = parent.parentNode;
		}
	
		if(bgColor !== transparent) 
		{
			bgLuma = calcBrightness(getRGBarr(bgColor));
		}
	
		return bgLuma;
	}

	if(skipWhites) 
	{
		const white = [
			"rgb(255, 255, 255)", 
			"rgb(254, 254, 254)", 
			"rgb(253, 253, 253)", 
			"rgb(252, 252, 252)", 
			"rgb(251, 251, 251)",
			"rgb(250, 250, 250)"
		];
		
		colorsToSkip.push(...white);
	}

	if(skipHeadings)
	{  
		tagsToSkip.push(...["H1", "H2", "H3"]);
	}

	let callcnt 		= 0;
	let rgba_cnt 		= 0;

	const process = nodes =>
	{
		// Debugging 
		let db_arr = [];
		
		const db_node = false;
		const db_time = false;
		
		let db_timestr = `Process ${callcnt++} time`;
		
		if(db_time) console.time(db_timestr);
		/************/

		let nodes_to_skip = [];

		nodes = applyExceptions(nodes);

		const setNodeAttribs = (node, callback) => 
		{
			const tag = String(node.nodeName);
			
			if(tagsToSkip.includes(tag)) return;

			const classe = String(node.className);
			const style = getComputedStyle(node);
			
			if(size > 0)
			{
				const font_sz = parseInt(style.getPropertyValue("font-size"));
				
				if(font_sz < sizeThreshold) 
				{
					node.setAttribute("s__", font_sz); 
				}
			}
   
			let img_offset = 0;

			if(procImg) 
			{
				const bg_img = style.getPropertyValue("background-image");

				if(bg_img !== "none")
				{
					const img_children = nlToArr(node.getElementsByTagName("*"));
					
					nodes_to_skip.push(...img_children);
					img_offset = 127;
				}

				if(nodes_to_skip.includes(node)) img_offset = 96;
			}
		   
			if(outline)
			{
				if(node.nodeName === "INPUT" && node.type !== "submit") node.setAttribute("b__", "");
			}

			if(!containsText(node)) return;
	
			const color = style.getPropertyValue("color");
			
			if(colorsToSkip.includes(color)) return;
			
			let rgb_arr = getRGBarr(color);
			
			if(typeof rgb_arr[3] !== 'undefined')
			{
				node.setAttribute("rgba__", rgba_cnt);
				
				const new_color = color.replace(/\d\.\d+/, '1');
				
				callback(`[rgba__='${rgba_cnt++}']{color:${new_color}!important}`);
			}
			
			const bg_color 		= style.getPropertyValue("background-color");
			const bg_brt 		= getBackgroundBrightness(node.parentNode, bg_color);
			const fg_brt 		= calcBrightness(rgb_arr);
			const colorfulness 	= calcColorfulness(rgb_arr);

			let db_obj = {};
	
			if(db_node)
			{
				db_obj = {
					tag,
					fg_brt,
					bg_brt,
					colorfulness,
				};
	
				db_arr.push(db_obj);
			}

			const bg_threshold = 160 - strength + img_offset;

			if(bg_brt < bg_threshold) return; 

			const contrast = +Math.abs(bg_brt - fg_brt).toFixed(2);
		   
			const is_link = tag === "A";

			if(avoidReadable)
			{ 
				let   min_contrast	= 132 + (strength / 2);
				const min_link_contrast = 96 + (strength / 3); 
				const min_colorfulness	= 32;
				
				if(db_node) 
				{
					Object.assign(db_obj, {contrast, min_contrast, min_link_contrast});
				}
				
				if(is_link)
				{
					min_contrast = min_link_contrast;
				}
				
				if(contrast > min_contrast && colorfulness > min_colorfulness)
				{
					return;
				}
			}

			node.setAttribute("d__", 0);

			if(underlineLinks && is_link)
			{
				node.setAttribute("u__", 0);
			}
		};

		let rgba_buf = [];

		const processLargeArray = arr =>
		{
			const chunk = 200;
			const len = arr.length;
			
			let idx = 0;
			
			const doChunk = () => 
			{
				let count = chunk;
			  
				while (count-- && idx < len) 
				{
					setNodeAttribs(arr[idx++], rgba_str => rgba_buf.push(rgba_str));
				}
				
				if(idx < len) 
				{
					setTimeout(doChunk, 0);
				}
			};

			doChunk();
		}

		processLargeArray(nodes);
		
		t.nodeValue += rgba_buf.join('');

		if(db_time) console.timeEnd(db_timestr);
		if(db_node) console.table(db_arr);
	}

	const buildCSS = () => 
	{
		let color_black = 'color:rgba(0, 0, 0, 1)!important';
		
		let dim = '';
		
		if(advDimming) 
		{
			dim = `[d__],[d__][style]{filter:brightness(${brightness}%);}`;
		}
		else 	dim = `[d__],[d__][style]{${color_black}}`;
		
		let opacity		= '*,*[style]{opacity:1!important}';
		let bold		= '*{font-weight:bold!important}';
		let underline		= '[u__]{text-decoration:underline!important}';

		if(!forceOpacity) 	opacity = '';
		if(!boldText) 		bold = '';
		if(!underlineLinks) 	underline = '';
		if(!forcePlhdr) 	color_black = '';
		
		const placeholder = `::placeholder{opacity:1!important;${color_black}}`;
		
		const form_border = '[b__]{border:1px solid black!important}'; // Doesn't hurt to put it in, even if form borders are disabled

		let size_inc = '';

		if(size > 0) 
		{
			let i = 1;
			
			while(i <= sizeThreshold)
			{
				size_inc += `[s__='${i}']{font-size: calc(${i++}px + ${size}%)!important}\n`;
			}
		}

		return `${dim}${opacity}${size_inc}${bold}${placeholder}${form_border}${underline}`;
	}

	const css_rules = buildCSS();

	t.nodeValue = css_rules;
	
	process(nodes);

	const callback = mutations => 
	{
		let new_nodes = [];
		
		mutations.forEach(mut => 
		{
			for(const node of mut.addedNodes)
			{
				if(!(node instanceof Element)) continue;

				// Get children of node, then node itself
				const nodes = nlToArr(node.getElementsByTagName('*'));
				nodes.push(node);

				new_nodes.push(...nodes);
			}
		});
		
		process(new_nodes);
	};

	new MutationObserver(callback).observe(document.body, { childList: true, subtree: true });

	x.appendChild(t);
};

function init() 
{
	if(document.getElementById("_fc_")) 
	{
		x.appendChild(t);
		return;
	}

	createElem();

	let stored = [
		"whitelist", 
		//"blacklist", 
		"globalStr",
		"size",
		"sizeThreshold", 
		"skipColoreds", 
		"skipHeadings", 
		"advDimming", 
		"boldText", 
		"forceOpacity",
		"forcePlhdr",
		"smoothEnabled",
		"skipWhites",
		"underlineLinks"
	];

	browser.storage.local.get(stored, start);
}

init();

chrome.runtime.sendMessage({from: "yo", t: true});

function createElem() 
{
	const doc = document;

	x = doc.createElement("style");
	doc.head.appendChild(x);

	x.setAttribute("id", "_fc_");

	t = doc.createTextNode("");
}

function extractHostname(url) 
{
	let hostname;

	//Find and remove protocol (http, ftp, etc.) and get hostname
	if(url.indexOf("://") > -1) 
	{
		hostname = url.split('/')[2];
	}
	else
	{
		hostname = url.split('/')[0];
	}

	//Find and remove port number
	hostname = hostname.split(':')[0];

	//Find and remove "?"
	hostname = hostname.split('?')[0];
	hostname = hostname.replace('www.', '');

	return hostname;
}

function extractRootDomain(url) 
{
	let domain = extractHostname(url);
	let splitArr = domain.split('.');
	let len = splitArr.length;

	// Check if there is a subdomain
	if(len > 2)
	{
		domain = splitArr[len - 2] + '.' + splitArr[len - 1];
		
		// Check if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
		if (splitArr[len - 1].length === 2 && splitArr[len - 1].length === 2) 
		{
			domain = splitArr[len - 3] + '.' + domain;
		}
	}
	
	return domain;
}

function nlToArr(nl)
{
	let arr = [];

	for (let i = 0, len = arr.length = nl.length; i < len; ++i) arr[i] = nl[i];

	return arr;
}