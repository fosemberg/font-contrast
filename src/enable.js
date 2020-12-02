/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

"use strict";

// Style tag
var x;
// Text node
var t;

function getRGBarr(rgba_str)
{
	return rgba_str.match(/\d\.\d|\d+/g);
}

function calcBrightness([r, g, b, a = 1])
{
	return +(r * 0.2126 + g * 0.7152 + b * 0.0722).toFixed(1);
}

function calcColorfulness([r, g, b, a = 1])
{
	return Math.abs(r - g) + Math.abs(g - b);
}

function containsText(node)
{
	const children = Array.from(node.childNodes);

	return children.some(child => {
		return child.nodeType === Node.TEXT_NODE && /\S/.test(child.nodeValue);
	});
}

function getBgBrightness(parent, bg_color)
{
	// assume light-ish color if we can't find it
	let bg_luma = 236;

	const transparent = "rgba(0, 0, 0, 0)";

	while (bg_color === transparent && parent) {
		if (parent instanceof Element)
			bg_color = getComputedStyle(parent).getPropertyValue("background-color");

		parent = parent.parentNode;
	}

	if (bg_color !== transparent)
		bg_luma = calcBrightness(getRGBarr(bg_color));

	return bg_luma;
}

function getCSS(cfg) {

	const attr = '[d__],[d__][style]';
	let color_black = 'color:rgba(0, 0, 0, 1)!important';

	let dim = '';
	if (cfg.advDimming)
		dim = `${attr}{filter:brightness(${cfg.brightness}%);}`;
	else
		dim = `${attr}{${color_black}}`;

	let opacity =  '';
	if (cfg.forceOpacity)
		opacity = '*,*[style]{opacity:1!important}';

	let bold = '';
	if (cfg.boldText)
		bold = '*{font-weight:bold!important}';

	let underline = '';
	if (cfg.underlineLinks)
		underline = '[u__]{text-decoration:underline!important}';

	if (!cfg.forcePlhdr)
		color_black = '';

	const placeholder = `::placeholder{opacity:1!important;${color_black}}`;

	// Doesn't hurt to put it in, even if form borders are disabled
	const form_border = '[b__]{border:1px solid black!important}';

	let size_inc = '';

	if (cfg.size > 0) {
		let i = 1;

		while (i <= size_threshold)
			size_inc += `[s__='${i}']{font-size: calc(${i++}px + ${size}%)!important}\n`;
	}

	return `${dim}${opacity}${size_inc}${bold}${placeholder}${form_border}${underline}`;
}

function createElem()
{
	const doc = document;

	x = doc.createElement("style");
	doc.head.appendChild(x);
	x.setAttribute("id", "_fc_");

	t = doc.createTextNode("");
}

function nlToArr(nl)
{
	let arr = [];

	for (let i = 0, len = arr.length = nl.length; i < len; ++i)
		arr[i] = nl[i];

	return arr;
}

function init()
{
	if (document.getElementById("_fc_")) {
		x.appendChild(t);
		return;
	}

	createElem();

	const stored = [
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
		"underlineLinks",
		"input_border"
	];

	browser.storage.local.get(stored, start);
}

function start(cfg)
{
	let {
		whitelist,
		globalStr: strength,
		brightness,
		size,
		size_threshold,
		skipHeadings,
		skipColoreds: avoid_readable,
		advDimming,
		input_border,
		boldText,
		forcePlhdr,
		forceOpacity,
		smoothEnabled: transition,
		skipWhites,
		underlineLinks
	} = cfg;

	/**
	 * As this is the only script executed on the tab window,
	 * we can use window.location.hostname instead of a regex.
	 */
	const url = window.location.hostname;

	if (whitelist) {
		const idx = whitelist.findIndex(o => o.url === url);

		if (idx > -1) {
			const i = whitelist[idx];

			strength        = i.strength;
			size            = i.size;
			size_threshold  = i.threshold;
			skipHeadings    = i.skipHeadings;
			avoid_readable  = i.skipColoreds;
			advDimming      = i.advDimming;
			brightness      = i.brightness;
			input_border    = i.input_border;
			boldText        = i.boldText;
			forcePlhdr      = i.forcePlhdr;
			forceOpacity    = i.forceOpacity;
			skipWhites      = i.skipWhites;
			underlineLinks  = i.underlineLinks;
		}
	}

	if (transition) {
		const doc = document;

		let y = doc.createElement("style");
		doc.head.appendChild(y);
		y.setAttribute("id", "_fct_");

		const smooth_sz = size > 0 ? ' font-size,' : '';

		let z = doc.createTextNode(`[d__],[d__][style*]{
			transition: color${smooth_sz} .25s linear!important;
		}`);

		y.appendChild(z);
	}

	let nodes = nlToArr(document.body.getElementsByTagName('*'));

	let tags_to_skip = ["SCRIPT", "LINK", "STYLE", "IMG", "VIDEO", "SOURCE", "CANVAS"];
	let colors_to_skip = ["rgb(0, 0, 0)", "rgba(0, 0, 0, 0)"];

	let proc_img = true;

	const applyExceptions = (nodes) => {
		switch (url) {
		case "youtube.com":
			/**
			 * Filters youtube player. It doesn't get dimmed anyways,
			 * but let's make sure it stays untouched.
			 */
			nodes = nodes.filter(node => {
				return !String(node.className).startsWith("ytp")
			});
			proc_img = false;
			break;
		case "facebook.com":
			skipWhites = true;
			proc_img = false;
			break;
		}

		return nodes;
	};

	if (skipWhites) {
		const white = [
			"rgb(255, 255, 255)",
			"rgb(254, 254, 254)",
			"rgb(253, 253, 253)",
			"rgb(252, 252, 252)",
			"rgb(251, 251, 251)",
			"rgb(250, 250, 250)"
		];

		colors_to_skip.push(...white);
	}

	if (skipHeadings)
		tags_to_skip.push(...["H1", "H2", "H3"]);

	let callcnt = 0;

	const rgba_rules = new Set();

	const process = (nodes, mutation = false) =>
	{
		// Debug variables
		let   db_arr     = [];
		const db_node    = false;
		const db_time    = false;
		let   db_timestr = `Process ${callcnt++} time`;

		if (db_time)
			console.time(db_timestr);

		let nodes_to_skip = [];

		nodes = applyExceptions(nodes);

		const new_rgba_rules = new Set();

		const setAttribs = node => {

			const tag = String(node.nodeName);

			if (tags_to_skip.includes(tag))
				return;

			const style = getComputedStyle(node);

			if (size > 0) {
				const font_sz = parseInt(style.getPropertyValue("font-size"));

				if (font_sz < size_threshold)
					node.setAttribute("s__", font_sz);
			}

			let img_offset = 0;

			if (proc_img) {
				const bg_img = style.getPropertyValue("background-image");

				if (bg_img !== "none") {
					const img_children = nlToArr(node.getElementsByTagName("*"));
					nodes_to_skip.push(...img_children);
					img_offset = 127;
				}

				if (nodes_to_skip.includes(node))
					img_offset = 96;
			}

			if (input_border) {
				if(node.nodeName === "INPUT" && node.type !== "submit")
					node.setAttribute("b__", "");
			}

			if (!containsText(node))
				return;

			const color = style.getPropertyValue("color");

			if (colors_to_skip.includes(color))
				return;

			let rgba_arr = getRGBarr(color);

			if (!rgba_arr)
				return;

			if (rgba_arr.length > 3) {

				const class_name = `fc_rgba__${rgba_arr[0]}${rgba_arr[1]}${rgba_arr[2]}`;
				node.classList.add(class_name);

				const new_color = color.replace(/\d\.\d+/, '1');
				const rule      = `.${class_name}{color:${new_color}!important}`;

				new_rgba_rules.add(rule);
			}

			const fg_brt          = calcBrightness(rgba_arr);
			const fg_colorfulness = calcColorfulness(rgba_arr);

			const bg_color        = style.getPropertyValue("background-color");
			const bg_brt          = getBgBrightness(node.parentNode, bg_color);

			let db_obj = {};

			if (db_node) {
				db_obj = {
					tag,
					fg_brt,
					bg_brt,
					fg_colorfulness,
				};

				db_arr.push(db_obj);
			}

			const bg_threshold = 160 - strength + img_offset;

			if (bg_brt < bg_threshold)
				return;

			const contrast = +Math.abs(bg_brt - fg_brt).toFixed(2);
			const is_link  = tag === "A";

			if (avoid_readable) {
				let   min_contrast      = 132 + (strength / 2);
				const min_link_contrast = 96 + (strength / 3);
				const min_colorfulness  = 32;

				if (db_node)
					Object.assign(db_obj, { contrast, min_contrast, min_link_contrast });

				if (is_link)
					min_contrast = min_link_contrast;

				if (contrast > min_contrast && fg_colorfulness > min_colorfulness)
					return;
			}

			node.setAttribute("d__", 0);

			if (underlineLinks && is_link)
				node.setAttribute("u__", 0);
		};

		const iterateBigArr = (arr) => {
			const chunk = 200;
			const len   = arr.length;

			let idx = 0;

			const doChunk = () => {
				let c = chunk;

				while (c--) {
					if (idx > len - 1)
						return;

					setAttribs(arr[idx++]);
				}

				setTimeout(doChunk, 0);
			};

			doChunk();
		}

		iterateBigArr(nodes);

		// Get the RGBA selectors that aren't already present.
		const diff = [...new_rgba_rules].filter(x => !rgba_rules.has(x));

		if (diff.length) {
			t.nodeValue += diff.join('');

			for (const new_rule of new_rgba_rules)
				rgba_rules.add(new_rule);
		}

		if (db_time)
			console.timeEnd(db_timestr);

		if (db_node)
			console.table(db_arr);
	}

	t.nodeValue = getCSS(cfg);
	process(nodes);

	const observer = mutations => {
		let new_nodes = [];

		mutations.forEach(mut => {
			for (const node of mut.addedNodes) {
				if (!(node instanceof Element))
					continue;

				// Get children of node, then node itself
				const nodes = nlToArr(node.getElementsByTagName('*'));
				nodes.push(node);

				new_nodes.push(...nodes);
			}
		});

		if(new_nodes.length)
			setTimeout(() => process(new_nodes, true), 1000);
	};

	new MutationObserver(observer).observe(document.body, { childList: true, subtree: true });

	x.appendChild(t);
}

init();

chrome.runtime.sendMessage({from: "yo", t: true});
